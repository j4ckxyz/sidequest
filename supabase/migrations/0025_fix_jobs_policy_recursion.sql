-- Fix "infinite recursion detected in policy for relation jobs".
-- The jobs SELECT policy subqueried public.applications, whose own SELECT policy subqueries
-- public.jobs — so evaluating one re-evaluated the other without end. Move the "is this user an
-- accepted applicant on this job" check into a SECURITY DEFINER function, which bypasses RLS and
-- therefore never re-triggers the applications (or jobs) policy. This also removes an `id`
-- name-resolution ambiguity in the old inline subquery by passing the job id explicitly.

create or replace function public.is_accepted_applicant(p_job_id uuid, p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.applications a
    where a.job_id = p_job_id and a.quester_id = p_uid and a.status = 'accepted'
  );
$$;

drop policy if exists "open jobs are publicly readable" on public.jobs;
create policy "open jobs are publicly readable" on public.jobs
  for select using (
    (
      status = 'open'
      or poster_id = auth.uid()
      or assigned_quester_id = auth.uid()
      or public.is_accepted_applicant(id, auth.uid())
    )
    and (
      poster_id = auth.uid()
      or public.is_admin()
      or not public.is_blocked(poster_id)
    )
  );
