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
const WEIGHT = { posted: 1, applied: 1, accepted: 2, completed: 4 };
const SCORE_WEIGHT = { semantic: 0.68, nearby: 0.14, pay: 0.1, repeatPoster: 0.08 };

// Category exemplar texts, embedded once and reused, to derive each user's "best at" category
// by nearest cosine to their taste vector.
const CATEGORIES: { slug: string; text: string }[] = [
  { slug: 'gardening', text: 'Gardening — mowing lawns, hedges, weeding, planting' },
  { slug: 'shopping-errands', text: 'Shopping and errands — picking up groceries, running errands' },
  { slug: 'cleaning', text: 'Cleaning — houses, windows, tidying' },
  { slug: 'moving-help', text: 'Moving help — lifting furniture, loading vans, house moves' },
  { slug: 'pet-care', text: 'Pet care — dog walking, feeding, pet sitting' },
  { slug: 'elderly-help', text: 'Elderly help — companionship, help around the house for older people' },
  { slug: 'handyman', text: 'Handyman — repairs, DIY, fixing things, assembly' },
  { slug: 'tech-help', text: 'Tech help — computers, phones, software, setup' },
  { slug: 'childcare', text: 'Childcare — babysitting, minding children' },
  { slug: 'delivery', text: 'Delivery — dropping off and collecting items' },
  { slug: 'tutoring', text: 'Tutoring — teaching, lessons, exam help' },
  { slug: 'other', text: 'Other odd jobs and general help' },
];
let categoryVecs: { slug: string; vec: number[] }[] | null = null;

async function ensureCategoryVecs(): Promise<{ slug: string; vec: number[] }[]> {
  if (!categoryVecs) {
    const vecs = await embedBatch(CATEGORIES.map((c) => c.text), 'SEMANTIC_SIMILARITY');
    categoryVecs = CATEGORIES.map((c, i) => ({ slug: c.slug, vec: vecs[i] }));
  }
  return categoryVecs;
}

function topCategory(taste: number[], cats: { slug: string; vec: number[] }[]): string {
  let best = cats[0].slug;
  let bestDot = -Infinity;
  for (const c of cats) {
    let dot = 0;
    for (let i = 0; i < taste.length; i++) dot += taste[i] * c.vec[i];
    if (dot > bestDot) {
      bestDot = dot;
      best = c.slug;
    }
  }
  return best;
}

interface JobRow {
  id: string;
  poster_id: string;
  assigned_quester_id: string | null;
  title: string;
  description: string;
  category: string;
  parish: string;
  budget_type: string;
  budget_amount: number | null;
  status: string;
}

interface ProfileRow {
  id: string;
  parish: string;
  skills: string[];
  interest_keywords: string[];
  is_bot: boolean;
}

interface ApplicationRow {
  job_id: string;
  quester_id: string;
  status: string;
}

function sourceText(j: JobRow): string {
  return `${j.title}\n${j.description}\nCategory: ${j.category}\nParish: ${j.parish}`;
}

function preferenceText(profile: ProfileRow): string {
  return [
    profile.skills.length ? `Skills: ${profile.skills.join(', ')}` : '',
    profile.interest_keywords.length ? `Interests: ${profile.interest_keywords.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
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
  const [jobsResult, appsResult, profilesResult, jobHashesResult, profileHashesResult, existingRecsResult] = await Promise.all([
    admin
      .from('jobs')
      .select('id, poster_id, assigned_quester_id, title, description, category, parish, budget_type, budget_amount, status'),
    admin.from('applications').select('job_id, quester_id, status'),
    admin.from('profiles').select('id, parish, skills, interest_keywords, is_bot'),
    admin.from('job_embeddings').select('job_id, source_hash'),
    admin.from('profile_embeddings').select('user_id, source_hash'),
    admin.from('recommendations').select('user_id, job_id, reason'),
  ]);
  const { data: jobsData, error: jobsErr } = jobsResult;
  if (jobsErr) throw new Error(`load jobs: ${jobsErr.message}`);
  const jobs = (jobsData ?? []) as JobRow[];
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  const { data: appsData, error: appsErr } = appsResult;
  if (appsErr) throw new Error(`load applications: ${appsErr.message}`);
  const applications = (appsData ?? []) as ApplicationRow[];

  const { data: profilesData, error: profilesErr } = profilesResult;
  if (profilesErr) throw new Error(`load profiles: ${profilesErr.message} — is migration 0007 applied?`);
  const profiles = ((profilesData ?? []) as ProfileRow[]).filter((profile) => !profile.is_bot);

  const { data: embRows, error: jobHashesErr } = jobHashesResult;
  if (jobHashesErr) throw new Error(`read job embedding hashes: ${jobHashesErr.message}`);
  const existingHash = new Map((embRows ?? []).map((r) => [r.job_id as string, r.source_hash as string]));

  const { data: profileEmbRows, error: profileHashesErr } = profileHashesResult;
  if (profileHashesErr) throw new Error(`read profile embeddings: ${profileHashesErr.message} — is migration 0009 applied?`);
  const existingProfileHash = new Map((profileEmbRows ?? []).map((row) => [row.user_id as string, row.source_hash as string]));

  // ---- 1. embed jobs and preferences only when their source text changed ----
  const stale = jobs.filter((j) => existingHash.get(j.id) !== hash(sourceText(j)));
  const staleProfiles = profiles.filter((profile) => {
    const text = preferenceText(profile);
    return text && existingProfileHash.get(profile.id) !== hash(text);
  });
  const clearedProfileIds = profiles
    .filter((profile) => !preferenceText(profile) && existingProfileHash.has(profile.id))
    .map((profile) => profile.id);
  if (clearedProfileIds.length > 0) {
    const { error } = await admin.from('profile_embeddings').delete().in('user_id', clearedProfileIds);
    if (error) throw new Error(`clear profile embeddings: ${error.message}`);
  }
  const [jobVectors, profileVectors] = await Promise.all([
    stale.length > 0 ? embedBatch(stale.map(sourceText), 'RETRIEVAL_DOCUMENT') : Promise.resolve([]),
    staleProfiles.length > 0 ? embedBatch(staleProfiles.map(preferenceText), 'RETRIEVAL_QUERY') : Promise.resolve([]),
  ]);
  if (stale.length > 0) {
    const rows = stale.map((j, i) => ({
      job_id: j.id,
      embedding: toVectorLiteral(jobVectors[i]),
      source_hash: hash(sourceText(j)),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await admin.from('job_embeddings').upsert(rows);
    if (error) throw new Error(`upsert job_embeddings: ${error.message}`);
  }
  if (staleProfiles.length > 0) {
    const rows = staleProfiles.map((profile, index) => ({
      user_id: profile.id,
      embedding: toVectorLiteral(profileVectors[index]),
      source_hash: hash(preferenceText(profile)),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await admin.from('profile_embeddings').upsert(rows);
    if (error) throw new Error(`upsert profile_embeddings: ${error.message}`);
  }

  // Embedding map (existing + freshly written) for taste building.
  const [allJobEmbResult, allProfileEmbResult] = await Promise.all([
    admin.from('job_embeddings').select('job_id, embedding'),
    admin.from('profile_embeddings').select('user_id, embedding'),
  ]);
  const { data: allEmb, error: embErr } = allJobEmbResult;
  if (embErr) {
    throw new Error(
      `read job_embeddings: ${embErr.message} — is migration 0002_recommendations.sql applied?`,
    );
  }
  const embById = new Map<string, number[]>();
  for (const r of allEmb ?? []) embById.set(r.job_id as string, parseVector(r.embedding));
  const { data: allProfileEmb, error: profileEmbErr } = allProfileEmbResult;
  if (profileEmbErr) throw new Error(`read profile embeddings: ${profileEmbErr.message}`);
  const preferenceEmbByUser = new Map<string, number[]>();
  for (const row of allProfileEmb ?? []) preferenceEmbByUser.set(row.user_id as string, parseVector(row.embedding));

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
  for (const a of applications) {
    addWeight(a.quester_id, a.job_id, a.status === 'accepted' ? WEIGHT.accepted : WEIGHT.applied);
  }

  // Repeat posters get a small boost after a successful completed job together.
  const workedWith = new Set<string>();
  for (const application of applications) {
    const job = jobById.get(application.job_id);
    if (job?.status === 'completed' && application.status === 'accepted') {
      workedWith.add(`${application.quester_id}:${job.poster_id}`);
    }
  }
  for (const job of jobs) {
    if (job.status === 'completed' && job.assigned_quester_id) {
      workedWith.add(`${job.assigned_quester_id}:${job.poster_id}`);
    }
  }

  // Reason cache: reuse the "why" line for any (user, job) pair we've already explained, so a
  // refresh only calls the LLM for genuinely new picks. Main free-tier safeguard — a refresh
  // where nobody's top picks changed makes zero LLM calls.
  const { data: existingRecs, error: existingRecsErr } = existingRecsResult;
  if (existingRecsErr) throw new Error(`read recommendations: ${existingRecsErr.message}`);
  const cachedReason = new Map<string, string>();
  for (const r of existingRecs ?? []) cachedReason.set(`${r.user_id}:${r.job_id}`, (r.reason as string) ?? '');

  const cats = await ensureCategoryVecs();

  let usersProcessed = 0;
  let recommendationsWritten = 0;
  let reasonLlmCalls = 0;
  let reasonsReused = 0;

  for (const profile of profiles) {
    const userId = profile.id;
    const weights = history.get(userId) ?? new Map<string, number>();
    const historyTaste = weightedMean(weights, embById);
    const preferenceTaste = preferenceEmbByUser.get(userId) ?? null;
    const taste = blendTaste(historyTaste, preferenceTaste);
    if (!taste) {
      await admin.from('recommendations').delete().eq('user_id', userId);
      continue;
    }

    await admin.from('user_taste').upsert({
      user_id: userId,
      embedding: toVectorLiteral(taste),
      updated_at: new Date().toISOString(),
    });
    // AI "best at" — nearest category exemplar to the taste vector.
    await admin.from('profiles').update({ top_category: topCategory(taste, cats) }).eq('id', userId);

    // ---- 3. match open jobs ----
    const { data: matches, error: matchErr } = await admin.rpc('match_open_jobs', {
      p_embedding: toVectorLiteral(taste),
      p_exclude_user: userId,
      p_k: POOL_K,
    });
    if (matchErr) throw new Error(`match_open_jobs(${userId}): ${matchErr.message}`);
    const candidates = ((matches ?? []) as { job_id: string; distance: number }[])
      .map((candidate) => {
        const job = jobById.get(candidate.job_id);
        const semantic = clamp(1 - candidate.distance);
        const nearby = job?.parish === profile.parish ? 1 : 0;
        const pay = payScore(job?.budget_amount ?? null);
        const repeatPoster = job && workedWith.has(`${userId}:${job.poster_id}`) ? 1 : 0;
        return {
          ...candidate,
          score:
            semantic * SCORE_WEIGHT.semantic +
            nearby * SCORE_WEIGHT.nearby +
            pay * SCORE_WEIGHT.pay +
            repeatPoster * SCORE_WEIGHT.repeatPoster,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, POOL_K);
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
        userTasteSummary(profile, weights, jobById),
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
      score: c.score,
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

function blendTaste(historyTaste: number[] | null, preferenceTaste: number[] | null): number[] | null {
  if (!historyTaste) return preferenceTaste;
  if (!preferenceTaste) return historyTaste;
  const blended = historyTaste.map((value, index) => value * 0.7 + preferenceTaste[index] * 0.3);
  const magnitude = Math.sqrt(blended.reduce((sum, value) => sum + value * value, 0)) || 1;
  return blended.map((value) => value / magnitude);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function payScore(amount: number | null): number {
  if (amount == null || amount <= 0) return 0;
  return clamp(Math.log1p(amount) / Math.log1p(500));
}

function userTasteSummary(profile: ProfileRow, weights: Map<string, number>, jobById: Map<string, JobRow>): string {
  const parts = [historySummary(weights, jobById)];
  if (profile.skills.length) parts.push(`skills: ${profile.skills.join(', ')}`);
  if (profile.interest_keywords.length) parts.push(`interests: ${profile.interest_keywords.join(', ')}`);
  return parts.filter(Boolean).join('; ');
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
