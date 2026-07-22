-- The jobs SELECT policy needs to know whether the caller has an accepted application.
-- Querying applications inline recurses because applications' own SELECT policy queries jobs.
-- A security-definer helper performs this one boolean lookup without re-entering RLS.

create or replace function public.has_accepted_application(
  p_job_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    where a.job_id = p_job_id
      and a.quester_id = p_user_id
      and a.status = 'accepted'
  );
$$;

revoke all on function public.has_accepted_application(uuid, uuid) from public;
grant execute on function public.has_accepted_application(uuid, uuid) to anon, authenticated;

drop policy if exists "open jobs are publicly readable" on public.jobs;
create policy "open jobs are publicly readable" on public.jobs
  for select using (
    status = 'open'
    or poster_id = auth.uid()
    or assigned_quester_id = auth.uid()
    or public.has_accepted_application(id)
  );
