// SideQuest recommendations service (Bun + Hono).
//   bun run server/index.ts
// Reads the root .env (SUPABASE_URL, SUPABASE_SECRET_KEY, GEMINI_API_KEY, …).

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { admin, isAdmin, userIdFromToken } from './supabaseAdmin';
import { embedOne } from './gemini';
import { refresh, pendingNewJobCount, type RefreshResult } from './pipeline';

const PORT = Number(process.env.PORT ?? '8787');
// Bind to localhost by default — Nginx (public :443) reverse-proxies to this. Set HOST=0.0.0.0
// only if you deliberately want the port publicly reachable.
const HOST = process.env.HOST ?? '127.0.0.1';
const CRON_SECRET = process.env.CRON_SECRET;
const REFRESH_INTERVAL_MS = Number(process.env.REFRESH_INTERVAL_MS ?? String(60 * 60 * 1000)); // hourly full refresh
const WATCH_INTERVAL_MS = Number(process.env.WATCH_INTERVAL_MS ?? String(2 * 60 * 1000)); // check for new jobs every 2m
const NEW_JOBS_THRESHOLD = Number(process.env.NEW_JOBS_THRESHOLD ?? '5'); // fire early once this many new jobs pile up

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

app.get('/health', (c) => c.json({ ok: true }));

/**
 * Trigger a refresh. Authorised either by the cron secret (systemd/curl) or by an
 * admin's Supabase access token (the in-app "Refresh recommendations" button).
 */
app.post('/refresh', async (c) => {
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

/** Semantic job search (scaffolded; not yet wired into the UI). */
app.post('/search', async (c) => {
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
    const pending = await pendingNewJobCount();
    if (pending >= NEW_JOBS_THRESHOLD) {
      console.log(`[refresh] ${pending} new jobs (≥${NEW_JOBS_THRESHOLD}) → refreshing early`);
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
