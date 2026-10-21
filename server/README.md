# SideQuest recommendations service

Small Bun + Hono service that powers "Picked for you". It embeds jobs with Gemini, builds a
taste vector per user from their history, matches open jobs with pgvector, and writes a short
flash-lite reason. Supabase stays the system of record; this service only talks to it with the
service key.

## What it does

- Hourly (configurable) it runs the full refresh pipeline (`pipeline.ts`).
- `POST /refresh` triggers a refresh on demand (cron secret or an admin's Supabase token).
- `POST /search` — semantic job search (scaffolded, not yet used by the app).
- `GET/POST /preferences` — read and save private topic/location settings for the signed-in user.
- `POST /preferences/chat` — one bounded Gemini turn that updates the user's private matching brief.
- `GET /health` — liveness.

## Free-tier safety / caching

Gemini calls are kept to the minimum:

- **Job embeddings are content-hashed.** A job is only (re-)embedded when its title/description/
  category/parish actually change (`job_embeddings.source_hash`). Unchanged jobs — including all
  completed/closed ones, whose text never changes — are embedded once, then never again. Embeddings
  are cached in Postgres and survive restarts. Requests are batched (`batchEmbedContents`, 50% price)
  with exponential backoff + retry on HTTP 429/503.
- **Preference embeddings are content-hashed too.** Skills and free-text interest keywords are only
  re-embedded when the user changes them. Ranking blends semantic/history similarity with smaller
  boosts for the same parish, higher pay, and posters the helper has completed work with before.
- **Reason lines are cached per (user, job).** A refresh only calls flash-lite for *new* picks that
  don't yet have a stored reason. A refresh where nobody's top picks changed makes **zero** LLM calls.
  The `/refresh` response reports `reasonLlmCalls` vs `reasonsReused` so you can watch the ratio.
- **Refreshes coalesce.** Hourly, watch-triggered, cron, and admin-button triggers all share one
  in-flight run — never two refreshes at once. The watch loop only fires once `NEW_JOBS_THRESHOLD`
  new jobs exist or a preference hash changes, and its polling is DB-only (no Gemini).
- **Preference chat is limited per person and per project.** Burst buckets default to 4 turns/minute
  per user and 10/minute globally. Atomic Postgres allowances default to 20 turns/day per user and
  100/day globally; both survive restarts and are claimed before calling Gemini. Daily windows align
  with Gemini's Pacific-time reset. Conversation context is capped to the latest 8 turns and each
  request has bounded input/output lengths.

Net effect: a steady state with no new/changed jobs costs nothing; a burst of new jobs costs one
embedding batch plus one small flash-lite call per user whose picks actually changed.

## Run locally

Uses the repo-root `.env`. Required: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`.
Optional: `GEMINI_EMBED_MODEL` (default `gemini-embedding-001`), `GEMINI_CHAT_MODEL`
(default `gemini-flash-lite-latest`), `EMBED_DIMS` (default `768`), `PORT` (default `8787`),
`CRON_SECRET`, `REFRESH_INTERVAL_MS`.
Preference chat limits are configurable with `PREFERENCE_CHAT_DAILY_LIMIT`,
`PREFERENCE_CHAT_BURST_LIMIT`, `PREFERENCE_CHAT_GLOBAL_DAILY_LIMIT`,
`PREFERENCE_CHAT_GLOBAL_BURST_LIMIT`, and `PREFERENCE_CHAT_BURST_WINDOW_MS`.

```sh
bun run server                # from repo root
curl localhost:8787/health
curl -XPOST localhost:8787/refresh -H "x-cron-secret: $CRON_SECRET"
```

> Requires migration `supabase/migrations/0002_recommendations.sql` applied (pgvector +
> `job_embeddings`, `user_taste`, `recommendations`, `match_open_jobs`).

## Deploy (cheap Linux box)

1. Install Bun, clone the repo to `/opt/sidequest`, `bun install`.
2. Put production `SUPABASE_*`, `GEMINI_API_KEY`, and a strong `CRON_SECRET` in
   `/opt/sidequest/.env`.
3. Install the unit and start it:

```sh
sudo cp deploy/sidequest-recs.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now sidequest-recs
journalctl -u sidequest-recs -f
```

4. Put it behind HTTPS. The service speaks plain HTTP on `127.0.0.1:8787`; terminate TLS with
   Nginx + Let's Encrypt using `deploy/nginx-sidequest-recs.conf` (a browser on an HTTPS page
   can't call an HTTP backend). Expose only 443 (and 80 for certbot); keep 8787 on localhost.

The service refreshes on its own interval; the app's admin "Refresh recommendations" button
hits `/refresh` with the admin's token for an immediate run. Point the frontend at the box
with `VITE_RECS_API_URL=https://recs.sidequest.je` in `.env.production`.
