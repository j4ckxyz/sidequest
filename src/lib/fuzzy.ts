// Lightweight, dependency-free fuzzy matching for job search. Tolerates plurals,
// minor typos, and word-order differences so a loose query ("dogs", "gardner")
// still surfaces relevant jobs — and ranks the closest matches highest.

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

// Strip a few common English suffixes so "dogs"→"dog", "walking"→"walk".
function stem(word: string): string {
  return word
    .replace(/(ing|ed|ers|er|es|s)$/, '')
    .replace(/(.)\1$/, '$1'); // collapse a trailing doubled letter (walkk→walk)
    // (cheap stemmer — good enough for short job text, not linguistically exact)
}

// Bounded Levenshtein: stops early once distance exceeds `max`.
function levenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      curr[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[b.length];
}

// Similarity of two single tokens, 0..1.
function tokenSim(q: string, t: string): number {
  if (q === t) return 1;
  const qs = stem(q);
  const ts = stem(t);
  if (qs === ts) return 0.95;
  if (q.length >= 3 && (t.startsWith(q) || q.startsWith(t))) return 0.9;
  // Substring containment only when the shorter token is long enough to be meaningful —
  // otherwise stopwords like "to" match inside "laptop" and pollute results.
  if (Math.min(q.length, t.length) >= 4 && (t.includes(q) || q.includes(t))) return 0.82;
  const max = q.length <= 4 ? 1 : 2;
  const dist = levenshtein(q, t, max);
  if (dist <= max) return 0.72 * (1 - dist / (Math.max(q.length, t.length) || 1));
  const ds = levenshtein(qs, ts, max);
  if (ds <= max) return 0.68 * (1 - ds / (Math.max(qs.length, ts.length) || 1));
  return 0;
}

/**
 * Relevance of `text` to `query`, 0..1. A direct substring hit is strongest;
 * otherwise every query token takes its best fuzzy match against the text's
 * tokens and the mean is returned. Threshold around 0.5 keeps noise out.
 */
export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const t = text.toLowerCase();
  if (t.includes(q)) return 1;

  const qTokens = tokenize(q);
  if (qTokens.length === 0) return 0;
  const tTokens = tokenize(t);
  if (tTokens.length === 0) return 0;

  let total = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const tt of tTokens) {
      const sim = tokenSim(qt, tt);
      if (sim > best) best = sim;
      if (best === 1) break;
    }
    total += best;
  }
  return total / qTokens.length;
}

/**
 * Relevance of a job to a query across its fields, weighted so a title hit outranks a
 * description hit. Returns ~0..1.1. A match in more than one field gets a small bonus so
 * "garden gate" (title) beats an incidental "garden" mention in an unrelated description.
 */
export function jobRelevance(
  query: string,
  fields: { title: string; category: string; description: string },
): number {
  const t = fuzzyScore(query, fields.title);
  const c = fuzzyScore(query, fields.category);
  const d = fuzzyScore(query, fields.description);
  // Title dominates, category close behind, description supports.
  const base = Math.max(t, c * 0.9, d * 0.72);
  const fieldsHit = (t >= 0.5 ? 1 : 0) + (c >= 0.5 ? 1 : 0) + (d >= 0.5 ? 1 : 0);
  const bonus = fieldsHit >= 2 ? 0.08 : 0;
  return Math.min(1.1, base + bonus);
}

/** Minimum jobRelevance for a job to count as a lexical match. */
export const RELEVANCE_THRESHOLD = 0.5;
