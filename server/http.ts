import type { Context } from 'hono';
import { isGeminiError, redact } from './gemini';

/** Log a failure server-side with any API key stripped (message + stack). */
export function logError(tag: string, err: unknown): void {
  const text = err instanceof Error ? (err.stack ?? `${err.name}: ${err.message}`) : String(err);
  console.error(`[${tag}]`, redact(text));
}

/**
 * The one way routes report a caught error: log it (redacted) and answer with a fixed message.
 * Upstream text — Gemini bodies, Supabase/Postgres messages — never reaches the client. Gemini
 * failures become 503 `ai_unavailable`; anything else is a 500 with the route's own fallback.
 */
export function routeError(c: Context, tag: string, err: unknown, fallback: string) {
  logError(tag, err);
  if (isGeminiError(err)) return c.json({ error: 'ai_unavailable' }, 503);
  return c.json({ error: fallback }, 500);
}
