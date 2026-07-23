// Proactive automoderation. Runs on a timer (see index.ts), scanning every post — new and
// old — without waiting for a user report. A cheap keyword prefilter picks out suspicious
// posts; only those are sent to Gemini for the actual decision, so the sweep stays cheap even
// with a big backlog. Enforcement mirrors the report flow: remove the post, or ban/suspend the
// poster and take down all their posts. Decisions are logged with decided_by = 'automod'.

import { admin } from './supabaseAdmin';
import { moderationDecision } from './gemini';

// Signals that a post is worth a full Gemini review. Deliberately broad — false positives are
// cheap (Gemini dismisses them) and cost only one model call; the risk is missing something.
const FLAG_PATTERNS: RegExp[] = [
  /\b(crypto|bitcoin|btc|ethereum|usdt|wallet|blockchain)\b/i,
  /\b(wire transfer|western union|money ?gram|bank (login|details|credentials)|routing number|sort code)\b/i,
  /\b(gift ?cards?|steam cards?|itunes cards?|vouchers?)\b/i,
  /\b(invest(ment)?|roi|guaranteed returns?|double your money|get rich|passive income|forex|trading signals?)\b/i,
  /\b(mlm|multi[- ]?level|downline|join my team|be your own boss|work from home earn)\b/i,
  /\b(click (this|here|the) link|bit\.ly|tinyurl|t\.me\/|whatsapp me|telegram me|dm me on)\b/i,
  /\b(nigerian prince|inheritance|lottery|you('ve| have) won|claim your prize)\b/i,
  /\b(seed phrase|private key|2fa code|one[- ]?time (code|password)|otp)\b/i,
  /\b(miracle cure|cure all|herbal drops|weight loss pills|no prescription)\b/i,
  /\b(off[- ]?platform|pay outside|cash only upfront|pay before)\b/i,
  /\bhttps?:\/\/(?!sidequest\.)/i, // external links (allow our own domain)
];

interface JobRow {
  id: string;
  poster_id: string;
  title: string;
  description: string;
}

function flagReasons(text: string): string[] {
  const hits = new Set<string>();
  for (const re of FLAG_PATTERNS) {
    const m = text.match(re);
    if (m) hits.add(m[0].toLowerCase());
  }
  return [...hits];
}

async function priorActionCount(userId: string): Promise<{ count: number; lines: string[] }> {
  const { data } = await admin
    .from('moderation_actions')
    .select('action, reason, created_at')
    .eq('target_user_id', userId)
    .neq('action', 'dismiss');
  const rows = data ?? [];
  return {
    count: rows.length,
    lines: rows.map(
      (a) => `[${new Date(a.created_at as string).toLocaleDateString('en-GB')}] ${a.action}: ${a.reason || 'N/A'}`,
    ),
  };
}

/** Delete every post by a user (used when automod bans/suspends them). No event stream — the
 * event table requires a report_id, and automod has none. The action row records it. */
async function takedownAllPosts(userId: string): Promise<void> {
  await admin.from('jobs').delete().eq('poster_id', userId);
}

async function enforce(job: JobRow, posterName: string, posterUsername: string): Promise<'clean' | 'acted'> {
  const flags = flagReasons(`${job.title}\n${job.description}`);
  if (flags.length === 0) return 'clean';

  const { count, lines } = await priorActionCount(job.poster_id);
  const verdict = await moderationDecision({
    targetType: 'job',
    targetName: posterName || 'the user',
    targetUsername: posterUsername || '',
    reason: `Automated background scan flagged suspicious content (matched: ${flags.join(', ')}). Decide if it truly breaks the rules.`,
    content: `${job.title}\n${job.description}`,
    priorActions: count,
    historyLines: lines,
  });

  const logLine = verdict.rationale || verdict.reason;
  const uid = job.poster_id;

  if (verdict.decision === 'remove_post') {
    await admin.from('moderation_actions').insert({
      report_id: null,
      decided_by: 'automod',
      action: 'remove_post',
      target_user_id: uid,
      job_id: job.id,
      reason: `Took down “${job.title}”: ${logLine}`,
    });
    await admin.from('jobs').delete().eq('id', job.id);
    return 'acted';
  }
  if (verdict.decision === 'ban_user') {
    const days = verdict.ban_days ?? 7;
    const banUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    await admin.from('profiles').update({ banned_until: banUntil, ban_reason: verdict.reason }).eq('id', uid);
    await admin.from('moderation_actions').insert({
      report_id: null,
      decided_by: 'automod',
      action: 'ban_user',
      target_user_id: uid,
      ban_until: banUntil,
      reason: logLine,
    });
    await takedownAllPosts(uid);
    return 'acted';
  }
  if (verdict.decision === 'suspend_user') {
    await admin.from('profiles').update({ suspended: true, ban_reason: verdict.reason }).eq('id', uid);
    await admin.from('moderation_actions').insert({
      report_id: null,
      decided_by: 'automod',
      action: 'suspend_user',
      target_user_id: uid,
      reason: logLine,
    });
    await takedownAllPosts(uid);
    return 'acted';
  }
  // dismiss: within the rules — don't clutter the log with an action row.
  return 'clean';
}

export interface AutomodResult {
  scanned: number;
  flaggedReviewed: number;
  enforced: number;
}

/**
 * Scan a batch of not-yet-checked posts. Clean posts (no keyword hits) are marked checked for
 * free; suspicious posts go to Gemini, up to `llmBudget` per sweep so one cycle can't run away
 * on a large backlog. Posts we don't get to this round stay unmarked and are picked up next time.
 */
export async function sweepAutomod(batch = 60, llmBudget = 12): Promise<AutomodResult> {
  const { data: jobs, error } = await admin
    .from('jobs')
    .select('id, poster_id, title, description')
    .is('automod_checked_at', null)
    .order('created_at', { ascending: true })
    .limit(batch);
  if (error || !jobs || jobs.length === 0) return { scanned: 0, flaggedReviewed: 0, enforced: 0 };

  // Skip posts by admins/owners (never auto-punish staff) and by already-banned/suspended
  // users (their content is on its way out anyway).
  const posterIds = [...new Set(jobs.map((j) => j.poster_id as string))];
  const { data: posters } = await admin
    .from('profiles')
    .select('id, full_name, username, is_admin, banned_until, suspended')
    .in('id', posterIds);
  const byId = new Map((posters ?? []).map((p) => [p.id as string, p]));

  const scannedIds: string[] = [];
  let flaggedReviewed = 0;
  let enforced = 0;
  let budget = llmBudget;

  for (const job of jobs as JobRow[]) {
    const poster = byId.get(job.poster_id);
    const isProtected = !poster || poster.is_admin || poster.suspended || (poster.banned_until && new Date(poster.banned_until as string) > new Date());
    if (isProtected) {
      scannedIds.push(job.id);
      continue;
    }

    const flags = flagReasons(`${job.title}\n${job.description}`);
    if (flags.length === 0) {
      scannedIds.push(job.id);
      continue;
    }
    if (budget <= 0) continue; // leave unmarked for the next sweep

    budget--;
    flaggedReviewed++;
    try {
      const outcome = await enforce(job, (poster.full_name as string) ?? '', (poster.username as string) ?? '');
      if (outcome === 'acted') enforced++;
      scannedIds.push(job.id); // may already be deleted; marking a gone row is a harmless no-op
    } catch (err) {
      console.error('[automod] enforce failed for job', job.id, err instanceof Error ? err.message : err);
      // leave unmarked so it's retried next sweep
    }
  }

  if (scannedIds.length > 0) {
    await admin.from('jobs').update({ automod_checked_at: new Date().toISOString() }).in('id', scannedIds);
  }
  return { scanned: scannedIds.length, flaggedReviewed, enforced };
}
