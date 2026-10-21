-- Migration: enable_rls_on_lookup_tables
-- Project: eskokazxbwqxcmvzctiu (SideQuest / "j4ckxyz's Project", org Hackathon)
-- Fixes advisor lint 0013 rls_disabled_in_public for public.parishes and public.job_categories.
--
-- Usage in the repo: neither table is queried by the frontend (src/lib/constants.ts hardcodes
-- PARISHES / JOB_CATEGORIES) or by server/ (service-role key, bypasses RLS anyway). They are
-- referenced by foreign keys from profiles/jobs (FK checks bypass RLS) and read by the
-- SECURITY DEFINER function save_job_preferences (owned by postgres, bypasses RLS).
-- They are written only by migrations / seed.sql (run as postgres).
-- => Keep public read (harmless reference data, keeps any future dropdown/embed working),
--    block every client write. TRUNCATE is not subject to RLS, so the write privileges are
--    revoked as well, not just covered by policies.

alter table public.parishes enable row level security;
alter table public.job_categories enable row level security;

create policy "parishes are publicly readable"
  on public.parishes for select
  to anon, authenticated
  using (true);

create policy "job categories are publicly readable"
  on public.job_categories for select
  to anon, authenticated
  using (true);

-- Explicit least-privilege grants (also matches the Oct 30 2026 "explicit grants" model).
revoke insert, update, delete, truncate, references, trigger on public.parishes from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.job_categories from anon, authenticated;
grant select on public.parishes to anon, authenticated;
grant select on public.job_categories to anon, authenticated;
grant select, insert, update, delete on public.parishes to service_role;
grant select, insert, update, delete on public.job_categories to service_role;
