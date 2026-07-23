-- Let posters delete their own posts at any status (not just 'open'), and let
-- reporters see their own reports so the UI can prevent duplicate reporting.

-- Posters can remove their own jobs whatever the status (open, cancelled,
-- completed, …) — cascades clean up applications/conversations/notifications.
drop policy if exists "posters delete their own open jobs" on public.jobs;
drop policy if exists "posters delete their own jobs" on public.jobs;
create policy "posters delete their own jobs" on public.jobs
  for delete using (poster_id = auth.uid());

-- Reporters can read their own reports (admins already can read all). This lets
-- the client show "already reported / reviewed" and block a second report.
drop policy if exists reports_read_own on reports;
create policy reports_read_own on reports
  for select using (auth.uid() = reporter_id);
