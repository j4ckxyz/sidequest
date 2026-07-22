// SideQuest recommendations service (Bun + Hono).
//   bun run server/index.ts
// Reads the root .env (SUPABASE_URL, SUPABASE_SECRET_KEY, GEMINI_API_KEY, …).

import { Hono, type Context, type Next } from 'hono';
import { cors } from 'hono/cors';
import { admin, isAdmin, userIdFromToken } from './supabaseAdmin';
import { embedOne, preferenceChat, type PreferenceChatTurn } from './gemini';
import { refresh, pendingNewJobCount, pendingPreferenceChangeCount, type RefreshResult } from './pipeline';
import { summonBots, removeBots } from './bots';

const PORT = Number(process.env.PORT ?? '8787');
// Bind to localhost by default — Nginx (public :443) reverse-proxies to this. Set HOST=0.0.0.0
// only if you deliberately want the port publicly reachable.
const HOST = process.env.HOST ?? '127.0.0.1';
const CRON_SECRET = process.env.CRON_SECRET;
const REFRESH_INTERVAL_MS = Number(process.env.REFRESH_INTERVAL_MS ?? String(60 * 60 * 1000)); // hourly full refresh
const WATCH_INTERVAL_MS = Number(process.env.WATCH_INTERVAL_MS ?? String(2 * 60 * 1000)); // check for new jobs every 2m
const NEW_JOBS_THRESHOLD = Number(process.env.NEW_JOBS_THRESHOLD ?? '5'); // fire early once this many new jobs pile up
const PREFERENCE_CHAT_DAILY_LIMIT = boundedEnvInt('PREFERENCE_CHAT_DAILY_LIMIT', 20, 1, 200);
const PREFERENCE_CHAT_BURST_LIMIT = boundedEnvInt('PREFERENCE_CHAT_BURST_LIMIT', 4, 1, 60);
const PREFERENCE_CHAT_GLOBAL_DAILY_LIMIT = boundedEnvInt('PREFERENCE_CHAT_GLOBAL_DAILY_LIMIT', 100, 1, 10_000);
const PREFERENCE_CHAT_GLOBAL_BURST_LIMIT = boundedEnvInt('PREFERENCE_CHAT_GLOBAL_BURST_LIMIT', 10, 1, 120);
const PREFERENCE_CHAT_BURST_WINDOW_MS = boundedEnvInt('PREFERENCE_CHAT_BURST_WINDOW_MS', 60_000, 1_000, 3_600_000);
const JOB_CATEGORY_SLUGS = new Set([
  'gardening',
  'shopping-errands',
  'cleaning',
  'moving-help',
  'pet-care',
  'elderly-help',
  'handyman',
  'tech-help',
  'childcare',
  'delivery',
  'tutoring',
  'other',
]);

function boundedEnvInt(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number(process.env[name] ?? fallback);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

// Coalesce every trigger (hourly, watch, admin button, cron) onto one in-flight run so
// concurrent triggers never stack up two refreshes at once.
let inFlight: Promise<RefreshResult> | null = null;
function runRefresh(): Promise<RefreshResult> {
  if (!inFlight) {
    inFlight = refresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

const app = new Hono();
app.use('/*', cors());

// Simple in-memory fixed-window rate limiter (per IP + path). Enough for a single-box service;
// keeps /search (hits Gemini) and /refresh from being hammered.
const buckets = new Map<string, { count: number; reset: number }>();
function claimBurst(key: string, max: number, windowMs: number): number | null {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return null;
  }
  bucket.count++;
  return bucket.count > max ? Math.max(1, Math.ceil((bucket.reset - now) / 1000)) : null;
}

function rateLimit(max: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown';
    const key = `${c.req.path}:${ip}`;
    const retryAfter = claimBurst(key, max, windowMs);
    if (retryAfter) {
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: 'Too many requests — slow down.' }, 429);
    }
    await next();
  };
}
// Occasionally drop expired buckets so the map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
}, 5 * 60 * 1000);

app.get('/health', (c) => c.json({ ok: true }));

/**
 * Trigger a refresh. Authorised either by the cron secret (systemd/curl) or by an
 * admin's Supabase access token (the in-app "Refresh recommendations" button).
 */
app.post('/refresh', rateLimit(6, 60_000), async (c) => {
  const authed = await authorizeRefresh(c.req.header('x-cron-secret'), c.req.header('Authorization'));
  if (authed === 'unauthenticated') return c.json({ error: 'Unauthorized' }, 401);
  if (authed === 'forbidden') return c.json({ error: 'Admins only' }, 403);

  try {
    const result = await runRefresh();
    return c.json({ ok: true, ...result });
  } catch (err) {
    console.error('[refresh] failed:', err);
    return c.json({ error: err instanceof Error ? err.message : 'Refresh failed' }, 500);
  }
});

/** Admin-only: conjure demo bot accounts + jobs. */
app.post('/bots', rateLimit(4, 60_000), async (c) => {
  if (!(await requireAdmin(c.req.header('Authorization')))) return c.json({ error: 'Admins only' }, 403);
  const body = (await c.req.json().catch(() => ({}))) as { count?: number };
  try {
    const result = await summonBots(Number(body.count) || 5);
    return c.json({ ok: true, ...result });
  } catch (err) {
    console.error('[bots] summon failed:', err);
    return c.json({ error: err instanceof Error ? err.message : 'Summon failed' }, 500);
  }
});

/** Admin-only: remove every bot account (and their jobs). */
app.post('/bots/remove', rateLimit(4, 60_000), async (c) => {
  if (!(await requireAdmin(c.req.header('Authorization')))) return c.json({ error: 'Admins only' }, 403);
  try {
    return c.json({ ok: true, ...(await removeBots()) });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Remove failed' }, 500);
  }
});

/** Private settings state. This endpoint never calls Gemini. */
app.get('/preferences', async (c) => {
  const userId = await authenticatedUserId(c.req.header('Authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  try {
    return c.json(await preferenceState(userId));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Could not load preferences' }, 500);
  }
});

/** Save private topic choices and location visibility without spending a Gemini request. */
app.post('/preferences', rateLimit(30, 60_000), async (c) => {
  const userId = await authenticatedUserId(c.req.header('Authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = (await c.req.json().catch(() => ({}))) as {
    preferredCategories?: unknown;
    hideLocation?: unknown;
  };
  if (!Array.isArray(body.preferredCategories) || typeof body.hideLocation !== 'boolean') {
    return c.json({ error: 'Invalid preferences.' }, 400);
  }
  const preferredCategories = [...new Set(body.preferredCategories)]
    .filter((category): category is string => typeof category === 'string' && JOB_CATEGORY_SLUGS.has(category))
    .slice(0, JOB_CATEGORY_SLUGS.size);
  if (preferredCategories.length !== body.preferredCategories.length) {
    return c.json({ error: 'One or more job topics are invalid.' }, 400);
  }

  try {
    const { error } = await admin.rpc('save_job_preferences', {
      p_user_id: userId,
      p_preferred_categories: preferredCategories,
      p_hide_location: body.hideLocation,
    });
    if (error) throw new Error(error.message);
    return c.json(await preferenceState(userId));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Could not save preferences' }, 500);
  }
});

const preferenceChatsInFlight = new Set<string>();

/** One bounded Gemini turn that updates a compact, reusable preference brief. */
app.post('/preferences/chat', async (c) => {
  const userId = await authenticatedUserId(c.req.header('Authorization'));
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = (await c.req.json().catch(() => ({}))) as { message?: unknown };
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 1000) {
    return c.json({ error: 'Write between 1 and 1,000 characters.' }, 400);
  }
  if (preferenceChatsInFlight.has(userId)) {
    return c.json({ error: 'Your previous message is still being considered.' }, 409);
  }
  const retryAfter = claimBurst(
    `preferences-chat:${userId}`,
    PREFERENCE_CHAT_BURST_LIMIT,
    PREFERENCE_CHAT_BURST_WINDOW_MS,
  );
  if (retryAfter) {
    c.header('Retry-After', String(retryAfter));
    return c.json({ error: `A few messages arrived too quickly. Try again in ${retryAfter} seconds.` }, 429);
  }
  const globalRetryAfter = claimBurst(
    'preferences-chat:global',
    PREFERENCE_CHAT_GLOBAL_BURST_LIMIT,
    PREFERENCE_CHAT_BURST_WINDOW_MS,
  );
  if (globalRetryAfter) {
    c.header('Retry-After', String(globalRetryAfter));
    return c.json({ error: 'The job compass is busy. Try again in a minute.' }, 429);
  }

  preferenceChatsInFlight.add(userId);
  try {
    const { data: claimed, error: quotaError } = await admin.rpc('claim_preference_chat_quota', {
      p_user_id: userId,
      p_user_daily_limit: PREFERENCE_CHAT_DAILY_LIMIT,
      p_global_daily_limit: PREFERENCE_CHAT_GLOBAL_DAILY_LIMIT,
    });
    if (quotaError) return c.json({ error: `Could not check AI allowance: ${quotaError.message}` }, 500);
    if (!claimed) {
      return c.json({ error: 'You have used today’s preference-chat allowance. It resets tomorrow.' }, 429);
    }

    const [savedResult, messagesResult] = await Promise.all([
      admin
        .from('job_preferences')
        .select('preferred_categories, summary')
        .eq('user_id', userId)
        .maybeSingle(),
      admin
        .from('job_preference_messages')
        .select('role, content')
        .eq('user_id', userId)
        .order('id', { ascending: false })
        .limit(8),
    ]);
    if (savedResult.error) throw new Error(savedResult.error.message);
    if (messagesResult.error) throw new Error(messagesResult.error.message);
    const saved = savedResult.data;
    const previousTurns = ((messagesResult.data ?? []) as PreferenceChatTurn[]).reverse();
    const result = await preferenceChat(
      (saved?.summary as string | undefined) ?? '',
      (saved?.preferred_categories as string[] | undefined) ?? [],
      [...previousTurns, { role: 'user', content: message }],
    );
    if (!result.reply || !result.summary) throw new Error('The preference assistant returned an empty response.');

    const { error: saveError } = await admin.rpc('save_preference_chat_turn', {
      p_user_id: userId,
      p_user_message: message,
      p_assistant_message: result.reply,
      p_summary: result.summary,
      p_keywords: result.keywords,
    });
    if (saveError) throw new Error(saveError.message);
    return c.json(await preferenceState(userId));
  } catch (err) {
    console.error('[preferences/chat] failed:', err);
    const message = err instanceof Error ? err.message : '';
    const assistantFailed = message.startsWith('Gemini ') || message.includes('preference assistant');
    return c.json(
      { error: assistantFailed ? 'The job compass is busy right now. Try again in a minute.' : message || 'Preference chat failed' },
      assistantFailed ? 503 : 500,
    );
  } finally {
    preferenceChatsInFlight.delete(userId);
  }
});

/** Semantic job search (scaffolded; not yet wired into the UI). */
app.post('/search', rateLimit(30, 60_000), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { query?: string; userId?: string };
  const query = body.query?.trim();
  if (!query) return c.json({ error: 'query required' }, 400);
  try {
    const vector = await embedOne(query, 'RETRIEVAL_QUERY');
    const { data, error } = await admin.rpc('match_open_jobs', {
      p_embedding: `[${vector.join(',')}]`,
      p_exclude_user: body.userId ?? '00000000-0000-0000-0000-000000000000',
      p_k: 20,
    });
    if (error) throw new Error(error.message);
    return c.json({ results: data ?? [] });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Search failed' }, 500);
  }
});

async function preferenceState(userId: string) {
  const quotaDate = pacificQuotaDate();
  const [preferenceResult, messagesResult, usageResult, globalUsageResult] = await Promise.all([
    admin
      .from('job_preferences')
      .select('preferred_categories, summary, keywords, updated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('job_preference_messages')
      .select('id, role, content, created_at')
      .eq('user_id', userId)
      .order('id', { ascending: false })
      .limit(40),
    admin
      .from('ai_daily_usage')
      .select('preference_chat_calls')
      .eq('user_id', userId)
      .eq('usage_date', quotaDate)
      .maybeSingle(),
    admin
      .from('ai_global_daily_usage')
      .select('preference_chat_calls')
      .eq('usage_date', quotaDate)
      .maybeSingle(),
  ]);
  if (preferenceResult.error) throw new Error(preferenceResult.error.message);
  if (messagesResult.error) throw new Error(messagesResult.error.message);
  if (usageResult.error) throw new Error(usageResult.error.message);
  if (globalUsageResult.error) throw new Error(globalUsageResult.error.message);
  const preference = preferenceResult.data;
  const used = Number(usageResult.data?.preference_chat_calls ?? 0);
  const globalUsed = Number(globalUsageResult.data?.preference_chat_calls ?? 0);
  return {
    preferred_categories: (preference?.preferred_categories as string[] | undefined) ?? [],
    summary: (preference?.summary as string | undefined) ?? '',
    keywords: (preference?.keywords as string[] | undefined) ?? [],
    updated_at: (preference?.updated_at as string | undefined) ?? null,
    messages: (messagesResult.data ?? []).reverse(),
    remaining_today: Math.max(
      0,
      Math.min(
        PREFERENCE_CHAT_DAILY_LIMIT - used,
        PREFERENCE_CHAT_GLOBAL_DAILY_LIMIT - globalUsed,
      ),
    ),
    daily_limit: PREFERENCE_CHAT_DAILY_LIMIT,
  };
}

function pacificQuotaDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

async function authenticatedUserId(authHeader: string | undefined): Promise<string | null> {
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  return token ? userIdFromToken(token) : null;
}

async function requireAdmin(authHeader: string | undefined): Promise<boolean> {
  const userId = await authenticatedUserId(authHeader);
  return !!userId && (await isAdmin(userId));
}

async function authorizeRefresh(
  cronSecret: string | undefined,
  authHeader: string | undefined,
): Promise<'ok' | 'unauthenticated' | 'forbidden'> {
  if (CRON_SECRET && cronSecret && cronSecret === CRON_SECRET) return 'ok';
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return 'unauthenticated';
  const userId = await userIdFromToken(token);
  if (!userId) return 'unauthenticated';
  return (await isAdmin(userId)) ? 'ok' : 'forbidden';
}

// Hourly full refresh (best-effort; logs and keeps the schedule on error).
setInterval(async () => {
  try {
    console.log('[refresh] hourly:', await runRefresh());
  } catch (err) {
    console.error('[refresh] hourly failed:', err);
  }
}, REFRESH_INTERVAL_MS);

// Watch loop: refresh early once enough new jobs have been posted, so semantic search and
// recommendations stay fresh without waiting for the top of the hour.
setInterval(async () => {
  if (inFlight) return;
  try {
    const [pendingJobs, pendingPreferences] = await Promise.all([
      pendingNewJobCount(),
      pendingPreferenceChangeCount(),
    ]);
    if (pendingJobs >= NEW_JOBS_THRESHOLD || pendingPreferences > 0) {
      console.log(
        `[refresh] ${pendingJobs} new jobs, ${pendingPreferences} changed preference profiles → refreshing early`,
      );
      console.log('[refresh] watch:', await runRefresh());
    }
  } catch (err) {
    console.error('[watch] failed:', err);
  }
}, WATCH_INTERVAL_MS);

console.log(
  `SideQuest recs service on :${PORT} — hourly refresh, watch every ${Math.round(WATCH_INTERVAL_MS / 60000)}m (threshold ${NEW_JOBS_THRESHOLD} new jobs)`,
);

export default { port: PORT, hostname: HOST, fetch: app.fetch };
