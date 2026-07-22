// Thin Gemini REST client — embeddings for matching, flash-lite for the "why" line.
// Model IDs are env-configurable; defaults are the ones verified live against this key.

const API_KEY = requireEnv('GEMINI_API_KEY');
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? 'gemini-embedding-001';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? 'gemini-flash-lite-latest';
export const EMBED_DIMS = Number(process.env.EMBED_DIMS ?? '768');

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

/**
 * One flash-lite call: given a user's history summary and candidate job titles, return a
 * short friendly reason per candidate. Falls back to [] on any parse failure — the caller
 * substitutes a heuristic reason so a bad LLM response never blocks recommendations.
 */
export async function reasons(historySummary: string, candidates: string[]): Promise<string[]> {
  if (candidates.length === 0) return [];
  const prompt = [
    'You write one short, warm, plain reason (max 12 words) why each job below suits a Jersey',
    'neighbour, based on what they have helped with before. No emojis. No job title echo.',
    '',
    `What they've done before: ${historySummary || 'nothing yet'}`,
    '',
    'Jobs:',
    ...candidates.map((c, i) => `${i + 1}. ${c}`),
    '',
    `Reply with a JSON array of exactly ${candidates.length} strings, in order.`,
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

function normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const mag = Math.sqrt(sum) || 1;
  return v.map((x) => x / mag);
}
