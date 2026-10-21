// Proactive automoderation. Every post — new and old — is reviewed by Gemini, no user report
// required and no keyword prefilter (keyword lists miss harms phrased innocently, e.g. staged
// insurance write-offs). To stay cheap on the free tier, where billing is per request rather than
// per token, each sweep sends posts to the model in BATCHES: one request moderates many posts.
// Reviewed posts are marked (automod_checked_at) so they're not re-checked — users can still
// report them manually. Enforcement mirrors the report flow: remove the post, or ban/suspend the
// poster and take down all their posts. Logged with decided_by = 'automod'.

import { admin } from './supabaseAdmin';
import { moderateBatch, type BatchPost, type BatchVerdict } from './gemini';
import { logError } from './http';

interface JobRow {
  id: string;
  poster_id: string;
  title: string;
  description: string;
}

interface PosterRow {
  id: string;
  full_name: string | null;
  username: string | null;
  is_admin: boolean | null;
  banned_until: string | null;
  suspended: boolean | null;
}

async function priorActionCounts(userIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (userIds.length === 0) return counts;
  const { data } = await admin
    .from('moderation_actions')
    .select('target_user_id')
    .in('target_user_id', userIds)
    .neq('action', 'dismiss');
  for (const row of data ?? []) {
    const id = row.target_user_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** Delete every post by a user (used when automod bans/suspends them). No event stream — the
 * event table requires a report_id, and automod has none; the action row records it. */
async function takedownAllPosts(userId: string): Promise<void> {
  await admin.from('jobs').delete().eq('poster_id', userId);
}

async function applyVerdict(job: JobRow, poster: PosterRow, verdict: BatchVerdict): Promise<boolean> {
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
    return true;
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
    return true;
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
    return true;
  }
  // dismiss: within the rules — no action row, just marked as reviewed by the caller.
  return false;
}

export interface AutomodResult {
  scanned: number;
  reviewed: number; // posts sent to the model
  enforced: number;
  requests: number; // model calls made this sweep
}

/** Count posts not yet reviewed by automod. Cheap head query used to decide when to sweep. */
export async function pendingAutomodCount(): Promise<number> {
  const { count } = await admin
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .is('automod_checked_at', null);
  return count ?? 0;
}

/**
 * Review a batch of not-yet-checked posts. Eligible posts are chunked and each chunk is one model
 * request (default 20 posts/request), up to `maxRequests` per sweep so one cycle is bounded. Posts
 * by staff or already-blocked users are skipped (marked reviewed). Posts we don't reach this sweep
 * stay unmarked for the next one.
 */
export async function sweepAutomod(batch = 80, chunkSize = 20, maxRequests = 4): Promise<AutomodResult> {
  const { data: jobsData, error } = await admin
    .from('jobs')
    .select('id, poster_id, title, description')
    .is('automod_checked_at', null)
    .order('created_at', { ascending: true })
    .limit(batch);
  if (error || !jobsData || jobsData.length === 0) return { scanned: 0, reviewed: 0, enforced: 0, requests: 0 };
  const jobs = jobsData as JobRow[];

  const posterIds = [...new Set(jobs.map((j) => j.poster_id))];
  const [{ data: posterData }, priors] = await Promise.all([
    admin.from('profiles').select('id, full_name, username, is_admin, banned_until, suspended').in('id', posterIds),
    priorActionCounts(posterIds),
  ]);
  const byPoster = new Map((posterData ?? []).map((p) => [p.id as string, p as PosterRow]));

  const isProtected = (poster: PosterRow | undefined): boolean =>
    !poster ||
    !!poster.is_admin ||
    !!poster.suspended ||
    (!!poster.banned_until && new Date(poster.banned_until) > new Date());

  // Split into posts we review (eligible) and posts we just mark as checked (protected posters).
  const eligible: JobRow[] = [];
  const skipIds: string[] = [];
  for (const job of jobs) {
    if (isProtected(byPoster.get(job.poster_id))) skipIds.push(job.id);
    else eligible.push(job);
  }

  const scannedIds: string[] = [...skipIds];
  let reviewed = 0;
  let enforced = 0;
  let requests = 0;

  for (let i = 0; i < eligible.length && requests < maxRequests; i += chunkSize) {
    const chunk = eligible.slice(i, i + chunkSize);
    const payload: BatchPost[] = chunk.map((j) => {
      const poster = byPoster.get(j.poster_id)!;
      return {
        id: j.id,
        title: j.title,
        description: j.description,
        posterName: poster.full_name ?? '',
        posterUsername: poster.username ?? '',
        priorActions: priors.get(j.poster_id) ?? 0,
      };
    });

    try {
      const verdicts = await moderateBatch(payload);
      requests++;
      const verdictById = new Map(verdicts.map((v) => [v.id, v]));
      for (const job of chunk) {
        reviewed++;
        const verdict = verdictById.get(job.id);
        const poster = byPoster.get(job.poster_id)!;
        if (verdict && verdict.decision !== 'dismiss') {
          const acted = await applyVerdict(job, poster, verdict);
          if (acted) enforced++;
        }
        scannedIds.push(job.id); // deleted rows mark as a harmless no-op
      }
    } catch (err) {
      logError('automod batch', err);
      // Leave this chunk unmarked so it retries next sweep; stop to avoid hammering on errors.
      break;
    }
  }

  if (scannedIds.length > 0) {
    await admin.from('jobs').update({ automod_checked_at: new Date().toISOString() }).in('id', scannedIds);
  }
  return { scanned: scannedIds.length, reviewed, enforced, requests };
}
