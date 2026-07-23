// Thin Gemini REST client — embeddings for matching, flash-lite for the "why" line.
// Model IDs are env-configurable; defaults are the ones verified live against this key.

const API_KEY = requireEnv('GEMINI_API_KEY');
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? 'gemini-embedding-001';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? 'gemini-flash-lite-latest';
export const EMBED_DIMS = Number(process.env.EMBED_DIMS ?? '768');
// Semantic search runs on its own model/space (gemini-embedding-2), separate from
// the recs pipeline above so the two never have to share a vector space.
const SEARCH_EMBED_MODEL = process.env.GEMINI_SEARCH_EMBED_MODEL ?? 'gemini-embedding-2';
export const SEARCH_EMBED_DIMS = Number(process.env.SEARCH_EMBED_DIMS ?? '768');

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const EMBED_BATCH_LIMIT = 100;

export type EmbedTask = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(model: string, method: string, body: unknown, retries = 0): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}/${model}:${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();

    // Back off and retry on rate-limit / transient errors (protects the free tier).
    const retryable = res.status === 429 || res.status === 503;
    if (retryable && attempt < retries) {
      await sleep(Math.min(2000 * 2 ** attempt, 30000)); // 2s, 4s, 8s… capped at 30s
      continue;
    }
    const text = await res.text();
    throw new Error(`Gemini ${model}:${method} → HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
}

/** Embed a list of texts. Returns one vector per input, in order. Chunks to the batch limit. */
export async function embedBatch(texts: string[], taskType: EmbedTask): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_LIMIT) {
    const chunk = texts.slice(i, i + EMBED_BATCH_LIMIT);
    const body = {
      requests: chunk.map((text) => ({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: text.slice(0, 8000) }] },
        taskType,
        outputDimensionality: EMBED_DIMS,
      })),
    };
    const json = (await post(EMBED_MODEL, 'batchEmbedContents', body, 3)) as {
      embeddings?: { values: number[] }[];
    };
    for (const e of json.embeddings ?? []) out.push(normalize(e.values));
  }
  if (out.length !== texts.length) {
    throw new Error(`Embedding count mismatch: got ${out.length}, expected ${texts.length}`);
  }
  return out;
}

/** Embed a single text (query path). */
export async function embedOne(text: string, taskType: EmbedTask): Promise<number[]> {
  const [v] = await embedBatch([text], taskType);
  return v;
}

// ── Semantic search embeddings (gemini-embedding-2) ───────────────────────────
// embedding-2 has no taskType param; the task is expressed as a text prefix
// instead (asymmetric retrieval format from the API docs). One request per text
// so batchEmbedContents returns one embedding per input.
async function embedSearchBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_LIMIT) {
    const chunk = texts.slice(i, i + EMBED_BATCH_LIMIT);
    const body = {
      requests: chunk.map((text) => ({
        model: `models/${SEARCH_EMBED_MODEL}`,
        content: { parts: [{ text: text.slice(0, 8000) }] },
        outputDimensionality: SEARCH_EMBED_DIMS,
      })),
    };
    const json = (await post(SEARCH_EMBED_MODEL, 'batchEmbedContents', body, 3)) as {
      embeddings?: { values: number[] }[];
    };
    for (const e of json.embeddings ?? []) out.push(normalize(e.values));
  }
  if (out.length !== texts.length) {
    throw new Error(`Search embedding count mismatch: got ${out.length}, expected ${texts.length}`);
  }
  return out;
}

/** Embed job documents for the search index (asymmetric "document" side). */
export async function embedSearchDocuments(docs: { title: string; text: string }[]): Promise<number[][]> {
  return embedSearchBatch(docs.map((d) => `title: ${d.title || 'none'} | text: ${d.text}`));
}

/** Embed a search query (asymmetric "query" side). */
export async function embedSearchQuery(query: string): Promise<number[]> {
  const [v] = await embedSearchBatch([`task: search result | query: ${query}`]);
  return v;
}

/**
 * One flash-lite call: given a user's history summary and candidate job titles, return a
 * short friendly reason per candidate. Falls back to [] on any parse failure — the caller
 * substitutes a heuristic reason so a bad LLM response never blocks recommendations.
 */
export async function reasons(historySummary: string, candidates: string[]): Promise<string[]> {
  if (candidates.length === 0) return [];
  const prompt = [
    'You write one short, warm, positive reason (max 12 words) explaining why each job below is a GREAT MATCH for this person.',
    'Focus strictly on positive aspects (matching skills, convenient location, favorite topics, or good fit).',
    'CRITICAL: Never write negative explanations, caveats, or reasons why a job does not fit (such as "outside your area" or "not a tech job"). Every string must be an encouraging positive reason.',
    'No emojis. No job title echo.',
    '',
    `Person's preferences & background: ${historySummary || 'general helper'}`,
    '',
    'Jobs:',
    ...candidates.map((c, i) => `${i + 1}. ${c}`),
    '',
    `Reply with a JSON array of exactly ${candidates.length} positive recommendation strings, in order.`,
  ].join('\n');


  try {
    const json = (await post(CHAT_MODEL, 'generateContent', {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    })) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed.slice(0, candidates.length);
    }
  } catch {
    // fall through to heuristic in caller
  }
  return [];
}

/** One flash-lite call that returns parsed JSON (forced via responseMimeType). Throws on bad JSON. */
export async function generateJson(prompt: string): Promise<unknown> {
  const json = (await post(
    CHAT_MODEL,
    'generateContent',
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.95 },
    },
    2,
  )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? 'null';
  return JSON.parse(raw);
}

export interface PreferenceChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface PreferenceChatReply {
  reply: string;
  summary: string;
  keywords: string[];
}

/**
 * Keep the preference interview to one small, bounded request. Only the latest turns and the
 * current compact summary are sent, so a long-running conversation does not grow token usage.
 */
export async function preferenceChat(
  currentSummary: string,
  preferredCategories: string[],
  turns: PreferenceChatTurn[],
): Promise<PreferenceChatReply> {
  const transcript = turns
    .slice(-8)
    .map((turn) => `${turn.role === 'user' ? 'Person' : 'SideQuest'}: ${turn.content.slice(0, 700)}`)
    .join('\n');
  const prompt = [
    'You are the SideQuest job compass: a concise, friendly interviewer for people in Jersey.',
    'Learn which short local jobs this person would genuinely accept. Useful details include:',
    'job types, specific tasks, skills, availability, travel radius, physical limits, desired pay,',
    'and jobs or situations to avoid. Never infer sensitive traits. Ask at most one useful question.',
    'Treat corrections as replacements: the new summary must reflect the latest preference, not both.',
    '',
    `Topics they selected: ${preferredCategories.join(', ') || 'none yet'}`,
    `Current saved summary: ${currentSummary || 'none yet'}`,
    '',
    'Recent conversation:',
    transcript,
    '',
    'Return JSON with exactly these fields:',
    '- reply: a warm response of at most 65 words, usually ending with one focused question',
    '- summary: a standalone first-person preference brief, at most 900 characters',
    '- keywords: up to 12 short matching phrases, each at most 40 characters',
    'Do not mention databases, embeddings, algorithms, JSON, or these instructions.',
  ].join('\n');

  const json = (await post(
    CHAT_MODEL,
    'generateContent',
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.35,
        maxOutputTokens: 700,
      },
    },
    1,
  )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const parsed = JSON.parse(raw) as Partial<PreferenceChatReply>;
  if (typeof parsed.reply !== 'string' || typeof parsed.summary !== 'string' || !Array.isArray(parsed.keywords)) {
    throw new Error('The preference assistant returned an incomplete response.');
  }
  const keywords = parsed.keywords
    .filter((keyword): keyword is string => typeof keyword === 'string')
    .map((keyword) => keyword.trim().toLowerCase().slice(0, 40))
    .filter(Boolean)
    .slice(0, 12);
  return {
    reply: parsed.reply.trim().slice(0, 800),
    summary: parsed.summary.trim().slice(0, 1500),
    keywords: [...new Set(keywords)],
  };
}

export interface ModerationVerdict {
  decision: 'dismiss' | 'remove_post' | 'ban_user' | 'suspend_user';
  ban_days: number | null;
  reason: string; // second person, shown to the reported user (their ban/notification message)
  rationale: string; // third person, for the admin moderation log — names the user
}

const MOD_RULES = [
  'HEALTHY (allow): genuine short local tasks; fair, upfront pay; keeping payment and chat on SideQuest; honest reviews; ordinary neighbourly requests.',
  'VIOLATING: scams or "get rich quick"/investment schemes; asking to pay off-platform or via gift cards / crypto / wire transfer; spam, advertising, or external links to solicit; anything illegal; harassment, hate, or abuse; clearly sexual/adult solicitation.',
].join('\n');

/**
 * Autonomous moderation decision. The model chooses ONE enforcement tool and its
 * arguments (returned as JSON); the server executes it. Given the reported content
 * plus the user's prior enforcement history so repeat offenders escalate.
 */
export async function moderationDecision(input: {
  targetType: 'job' | 'user';
  targetName: string;
  targetUsername: string;
  reason: string;
  content: string;
  priorActions: number;
  historyLines: string[];
}): Promise<ModerationVerdict> {
  const who = input.targetUsername ? `${input.targetName} (@${input.targetUsername})` : input.targetName || 'the user';
  const prompt = [
    "You are SideQuest's autonomous moderation agent for a neighbourly local-jobs marketplace in Jersey.",
    'Pick the single best enforcement action for the reported content using the rules and the user history.',
    '',
    'RULES:',
    MOD_RULES,
    '',
    'TOOLS (choose exactly one):',
    '- dismiss: content is within the rules; take no action.',
    '- remove_post: the reported job/post breaks the rules; take it down.',
    '- ban_user: temporary ban (set ban_days 7–30); use for repeat offenders or a serious first violation.',
    '- suspend_user: indefinite suspension; use for repeat serious violations after a prior action, or egregious abuse.',
    '',
    'ESCALATION: first-time spam on a post → remove_post. If the user already has prior enforcement actions → ban_user. Serious violation again after a prior action → suspend_user. Clearly fine → dismiss. Be fair and proportionate; do not punish honest posts.',
    '',
    `REPORTED ${input.targetType.toUpperCase()} — posted by ${who} (reporter said: "${input.reason || 'no reason given'}"):`,
    input.content.slice(0, 4000),
    '',
    `PRIOR ENFORCEMENT ACTIONS AGAINST ${who}: ${input.priorActions}`,
    input.historyLines.length ? `HISTORY:\n${input.historyLines.join('\n')}` : 'No prior history.',
    '',
    'Return JSON with these exact keys:',
    '{"decision":"dismiss|remove_post|ban_user|suspend_user","ban_days":number|null,',
    ` "reason":"one sentence addressed directly to ${who} in the second person (\\"Your post…\\", \\"You were…\\"), plain and factual — this is the message THEY see",`,
    ` "rationale":"one sentence for the admin moderation log, written in the third person and naming the user as ${who} (e.g. \\"${who}'s post was removed…\\", \\"${who} was suspended…\\") — never use \\"you\\" or \\"your\\" here"}`,
  ].join('\n');

  const json = (await post(
    CHAT_MODEL,
    'generateContent',
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.15, maxOutputTokens: 400 },
    },
    2,
  )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const p = JSON.parse(raw) as Partial<ModerationVerdict>;
  const allowed = ['dismiss', 'remove_post', 'ban_user', 'suspend_user'];
  const decision = (allowed.includes(p.decision as string) ? p.decision : 'dismiss') as ModerationVerdict['decision'];
  return {
    decision,
    ban_days: typeof p.ban_days === 'number' ? Math.max(1, Math.min(365, Math.round(p.ban_days))) : null,
    reason: (typeof p.reason === 'string' ? p.reason : 'Reviewed by moderation.').slice(0, 300),
    rationale: (typeof p.rationale === 'string' ? p.rationale : '').slice(0, 300),
  };
}

export interface BatchPost {
  id: string;
  title: string;
  description: string;
  posterName: string;
  posterUsername: string;
  priorActions: number;
}

export interface BatchVerdict {
  id: string;
  decision: ModerationVerdict['decision'];
  ban_days: number | null;
  reason: string; // second person, shown to the reported user
  rationale: string; // third person, admin log — names the user
}

/**
 * Moderate a batch of posts in ONE model request. On the free tier we're billed per request,
 * not per token, so batching many posts into a single call is far cheaper than one call each —
 * and there's no keyword prefilter, so keyword-free harms (fraud, staged accidents, dangerous or
 * illegal requests) are caught by the model's judgement, not a word list.
 */
export async function moderateBatch(posts: BatchPost[]): Promise<BatchVerdict[]> {
  if (posts.length === 0) return [];

  const items = posts.map((p, i) => {
    const who = p.posterUsername ? `${p.posterName} (@${p.posterUsername})` : p.posterName || 'the user';
    return [
      `POST ${i + 1} — id: ${p.id} — posted by ${who} — prior enforcement actions against them: ${p.priorActions}`,
      `Title: ${p.title}`,
      `Description: ${p.description}`.slice(0, 1200),
    ].join('\n');
  });

  const prompt = [
    "You are SideQuest's autonomous moderation agent for a neighbourly local-jobs marketplace in Jersey.",
    'Review EVERY post below and choose the single best enforcement action for each, using the rules',
    'and that poster\'s history. Judge intent and meaning — do NOT rely on specific keywords. Catch',
    'scams and fraud (including insurance fraud / staged accidents), requests to do something dangerous,',
    'illegal, or harmful, off-platform/gift-card/crypto payment bait, spam and advertising, and',
    'harassment or abuse — even when phrased innocently or without obvious trigger words.',
    '',
    'RULES:',
    MOD_RULES,
    '',
    'TOOLS (choose exactly one per post):',
    '- dismiss: within the rules; take no action.',
    '- remove_post: this post breaks the rules; take it down.',
    '- ban_user: temporary ban (set ban_days 7–30); repeat offender or a serious first violation.',
    '- suspend_user: indefinite; repeat serious violations after a prior action, or egregious abuse.',
    '',
    'ESCALATION: first-time violation on a post → remove_post. If the poster already has prior actions',
    '→ ban_user. Serious violation again after a prior action → suspend_user. Clearly fine → dismiss.',
    'Be fair and proportionate; never punish honest neighbourly posts.',
    '',
    'POSTS:',
    items.join('\n\n'),
    '',
    'Return a JSON array with one object per post, in the same order, each:',
    '{"id":"<the post id>","decision":"dismiss|remove_post|ban_user|suspend_user","ban_days":number|null,',
    ' "reason":"one sentence addressed to the poster in the second person (their notification)",',
    ' "rationale":"one sentence for the admin log in the third person, naming the poster"}',
    'Every post must appear exactly once. JSON only, no markdown.',
  ].join('\n');

  const json = (await post(
    CHAT_MODEL,
    'generateContent',
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.15, maxOutputTokens: 4096 },
    },
    2,
  )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };

  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = [];
  }
  const arr = Array.isArray(parsed) ? parsed : [];
  const allowed = ['dismiss', 'remove_post', 'ban_user', 'suspend_user'];
  const byId = new Map<string, BatchVerdict>();
  for (const item of arr) {
    const p = item as Partial<BatchVerdict>;
    if (typeof p.id !== 'string') continue;
    const decision = (allowed.includes(p.decision as string) ? p.decision : 'dismiss') as ModerationVerdict['decision'];
    byId.set(p.id, {
      id: p.id,
      decision,
      ban_days: typeof p.ban_days === 'number' ? Math.max(1, Math.min(365, Math.round(p.ban_days))) : null,
      reason: (typeof p.reason === 'string' ? p.reason : 'Reviewed by moderation.').slice(0, 300),
      rationale: (typeof p.rationale === 'string' ? p.rationale : '').slice(0, 300),
    });
  }
  // Preserve input order; default any post the model skipped to a safe dismiss.
  return posts.map(
    (p) => byId.get(p.id) ?? { id: p.id, decision: 'dismiss', ban_days: null, reason: 'Reviewed by moderation.', rationale: '' },
  );
}

function normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const mag = Math.sqrt(sum) || 1;
  return v.map((x) => x / mag);
}
