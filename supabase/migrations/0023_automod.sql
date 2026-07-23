-- Proactive automoderation: a background sweep scans every post (including old ones) for
-- harmful content without waiting for a user report. We mark each job once scanned so the
-- sweep doesn't re-check it every cycle; a NULL marker means "not yet scanned".

alter table public.jobs add column if not exists automod_checked_at timestamptz;

-- Fast lookup of the unscanned backlog.
create index if not exists jobs_automod_pending_idx
  on public.jobs (created_at)
  where automod_checked_at is null;

-- Automod writes enforcement rows with no originating report. report_id is already nullable
-- on moderation_actions; decided_by carries the free-text actor, so 'automod' needs no schema
-- change. This migration only adds the scan marker.
