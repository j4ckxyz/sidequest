// Hourly (or admin-triggered) recommendations refresh.
//
//   1. embed every job whose text changed  → job_embeddings
//   2. build each active user's taste vector → user_taste
//   3. cosine-match open jobs to that taste  → match_open_jobs()
//   4. one flash-lite call per user for reasons
//   5. replace that user's recommendations rows
//
// Runs with the service key, so it sees all rows regardless of RLS.

import { createHash } from 'node:crypto';
import { admin } from './supabaseAdmin';
import { embedBatch, reasons, EMBED_DIMS } from './gemini';

// Store a deep pool per user so the client can page through "other opportunities"
// without another server/LLM round-trip.
const POOL_K = Number(process.env.RECS_POOL_SIZE ?? '24');
const WEIGHT = { posted: 1, applied: 2, completed: 3 };

interface JobRow {
  id: string;
  poster_id: string;
  assigned_quester_id: string | null;
  title: string;
  description: string;
  category: string;
  parish: string;
  status: string;
}

function sourceText(j: JobRow): string {
  return `${j.title}\n${j.description}\nCategory: ${j.category}\nParish: ${j.parish}`;
}

function hash(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function toVectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`;
}

export interface RefreshResult {
  jobsEmbedded: number;
  usersProcessed: number;
  recommendationsWritten: number;
  reasonLlmCalls: number;
  reasonsReused: number;
}

/** How many open jobs still have no embedding — i.e. newly posted since the last refresh.
 *  The watch loop uses this to fire an early refresh once enough new jobs pile up. */
export async function pendingNewJobCount(): Promise<number> {
  const { data: open, error: openErr } = await admin.from('jobs').select('id').eq('status', 'open');
  if (openErr) throw new Error(`count open jobs: ${openErr.message}`);
  const { data: emb, error: embErr } = await admin.from('job_embeddings').select('job_id');
  if (embErr) throw new Error(`read job_embeddings: ${embErr.message} — is migration 0002 applied?`);
  const embedded = new Set((emb ?? []).map((r) => r.job_id as string));
  return (open ?? []).filter((j) => !embedded.has((j as { id: string }).id)).length;
}

export async function refresh(): Promise<RefreshResult> {
  // ---- load everything (island-scale: whole tables are small) ----
  const { data: jobsData, error: jobsErr } = await admin
    .from('jobs')
    .select('id, poster_id, assigned_quester_id, title, description, category, parish, status');
  if (jobsErr) throw new Error(`load jobs: ${jobsErr.message}`);
  const jobs = (jobsData ?? []) as JobRow[];
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  const { data: appsData, error: appsErr } = await admin.from('applications').select('job_id, quester_id');
  if (appsErr) throw new Error(`load applications: ${appsErr.message}`);
  const applications = (appsData ?? []) as { job_id: string; quester_id: string }[];

  const { data: embRows } = await admin.from('job_embeddings').select('job_id, source_hash');
  const existingHash = new Map((embRows ?? []).map((r) => [r.job_id as string, r.source_hash as string]));

  // ---- 1. embed jobs whose text changed ----
  const stale = jobs.filter((j) => existingHash.get(j.id) !== hash(sourceText(j)));
  if (stale.length > 0) {
    const vectors = await embedBatch(stale.map(sourceText), 'RETRIEVAL_DOCUMENT');
    const rows = stale.map((j, i) => ({
      job_id: j.id,
      embedding: toVectorLiteral(vectors[i]),
      source_hash: hash(sourceText(j)),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await admin.from('job_embeddings').upsert(rows);
    if (error) throw new Error(`upsert job_embeddings: ${error.message}`);
  }

  // Embedding map (existing + freshly written) for taste building.
  const { data: allEmb, error: embErr } = await admin.from('job_embeddings').select('job_id, embedding');
  if (embErr) {
    throw new Error(
      `read job_embeddings: ${embErr.message} — is migration 0002_recommendations.sql applied?`,
    );
  }
  const embById = new Map<string, number[]>();
  for (const r of allEmb ?? []) embById.set(r.job_id as string, parseVector(r.embedding));

  // ---- 2. per-user weighted history → taste vector ----
  const history = new Map<string, Map<string, number>>(); // userId → (jobId → weight)
  const addWeight = (userId: string, jobId: string, w: number) => {
    if (!history.has(userId)) history.set(userId, new Map());
    const m = history.get(userId)!;
    m.set(jobId, (m.get(jobId) ?? 0) + w);
  };
  for (const j of jobs) {
    addWeight(j.poster_id, j.id, WEIGHT.posted);
    if (j.status === 'completed') {
      addWeight(j.poster_id, j.id, WEIGHT.completed);
      if (j.assigned_quester_id) addWeight(j.assigned_quester_id, j.id, WEIGHT.completed);
    }
  }
  for (const a of applications) addWeight(a.quester_id, a.job_id, WEIGHT.applied);

  // Reason cache: reuse the "why" line for any (user, job) pair we've already explained, so a
  // refresh only calls the LLM for genuinely new picks. Main free-tier safeguard — a refresh
  // where nobody's top picks changed makes zero LLM calls.
  const { data: existingRecs } = await admin.from('recommendations').select('user_id, job_id, reason');
  const cachedReason = new Map<string, string>();
  for (const r of existingRecs ?? []) cachedReason.set(`${r.user_id}:${r.job_id}`, (r.reason as string) ?? '');

  let usersProcessed = 0;
  let recommendationsWritten = 0;
  let reasonLlmCalls = 0;
  let reasonsReused = 0;

  for (const [userId, weights] of history) {
    const taste = weightedMean(weights, embById);
    if (!taste) continue; // no embeddable history

    await admin.from('user_taste').upsert({
      user_id: userId,
      embedding: toVectorLiteral(taste),
      updated_at: new Date().toISOString(),
    });

    // ---- 3. match open jobs ----
    const { data: matches, error: matchErr } = await admin.rpc('match_open_jobs', {
      p_embedding: toVectorLiteral(taste),
      p_exclude_user: userId,
      p_k: POOL_K,
    });
    if (matchErr) throw new Error(`match_open_jobs(${userId}): ${matchErr.message}`);
    const candidates = (matches ?? []) as { job_id: string; distance: number }[];
    usersProcessed++;
    if (candidates.length === 0) {
      await admin.from('recommendations').delete().eq('user_id', userId);
      continue;
    }

    // ---- 4. reasons — reuse cached lines, only ask the LLM about new picks ----
    const reasonOut: string[] = new Array(candidates.length);
    const missingIdx: number[] = [];
    for (let i = 0; i < candidates.length; i++) {
      const cached = cachedReason.get(`${userId}:${candidates[i].job_id}`);
      if (cached) reasonOut[i] = cached;
      else missingIdx.push(i);
    }
    if (missingIdx.length > 0) {
      const missJobs = missingIdx.map((i) => jobById.get(candidates[i].job_id)).filter(Boolean) as JobRow[];
      const fresh = await reasons(
        historySummary(weights, jobById),
        missJobs.map((j) => `${j.title} (${j.category}, ${j.parish})`),
      );
      reasonLlmCalls++;
      missingIdx.forEach((idx, k) => {
        reasonOut[idx] = fresh[k]?.trim() || heuristicReason(jobById.get(candidates[idx].job_id));
      });
    }
    reasonsReused += candidates.length - missingIdx.length;

    // ---- 5. replace recommendations ----
    const rows = candidates.map((c, i) => ({
      user_id: userId,
      job_id: c.job_id,
      score: 1 - c.distance,
      rank: i + 1,
      reason: reasonOut[i],
    }));
    await admin.from('recommendations').delete().eq('user_id', userId);
    const { error: insErr } = await admin.from('recommendations').insert(rows);
    if (insErr) throw new Error(`insert recommendations(${userId}): ${insErr.message}`);
    recommendationsWritten += rows.length;
  }

  return { jobsEmbedded: stale.length, usersProcessed, recommendationsWritten, reasonLlmCalls, reasonsReused };
}

function weightedMean(weights: Map<string, number>, embById: Map<string, number[]>): number[] | null {
  const acc = new Array(EMBED_DIMS).fill(0);
  let total = 0;
  for (const [jobId, w] of weights) {
    const emb = embById.get(jobId);
    if (!emb) continue;
    for (let i = 0; i < EMBED_DIMS; i++) acc[i] += emb[i] * w;
    total += w;
  }
  if (total === 0) return null;
  const mean = acc.map((x) => x / total);
  const mag = Math.sqrt(mean.reduce((s, x) => s + x * x, 0)) || 1;
  return mean.map((x) => x / mag);
}

function historySummary(weights: Map<string, number>, jobById: Map<string, JobRow>): string {
  const counts = new Map<string, number>();
  for (const jobId of weights.keys()) {
    const cat = jobById.get(jobId)?.category;
    if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat, n]) => `${cat} ×${n}`)
    .join(', ');
}

function heuristicReason(job: JobRow | undefined): string {
  if (!job) return 'Might suit you';
  return `Close to jobs you've helped with in ${job.category.replace(/-/g, ' ')}`;
}

function parseVector(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw as number[];
  // pgvector serialises as a "[0.1,0.2,...]" string over the wire.
  return String(raw)
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(Number);
}
