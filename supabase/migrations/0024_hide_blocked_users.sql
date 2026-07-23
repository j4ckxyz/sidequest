-- Banned or suspended users disappear from the public app entirely: their posts stop showing
-- and their profile page reports the suspension. This is enforced statefully in the database
-- (not only by a delete at ban-time), so lingering content from a user blocked earlier is hidden
-- too. Admins and the user themselves can still see everything.

-- Security-definer predicate: is this user currently blocked (suspended or within a timed ban)?
-- SECURITY DEFINER so it can read profiles regardless of the caller's row-level access, which
-- avoids RLS recursion when used inside other policies.
create or replace function public.is_blocked(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select suspended or (banned_until is not null and banned_until > now())
       from public.profiles where id = uid),
    false
  );
$$;

-- 1. Hide blocked users' jobs from everyone except the poster and admins.
drop policy if exists "open jobs are publicly readable" on public.jobs;
create policy "open jobs are publicly readable" on public.jobs
  for select using (
    (
      status = 'open'
      or poster_id = auth.uid()
      or assigned_quester_id = auth.uid()
      or exists (
        select 1 from public.applications a
        where a.job_id = id and a.quester_id = auth.uid() and a.status = 'accepted'
      )
    )
    and (
      poster_id = auth.uid()
      or public.is_admin()
      or not public.is_blocked(poster_id)
    )
  );

-- 2. Expose a blocked flag on the public profile view so the profile page can show a
--    suspension notice instead of the normal profile.
create or replace view public.public_profiles
with (security_invoker = false)
as
select
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.bio,
  case
    when p.id = auth.uid() or public.is_admin() or not p.hide_location then p.parish
    else null
  end as parish,
  case when p.id = auth.uid() or public.is_admin() then p.phone else null end as phone,
  p.skills,
  p.is_verified,
  p.is_admin,
  p.is_owner,
  p.is_bot,
  case when p.id = auth.uid() or public.is_admin() then p.interest_keywords else '{}'::text[] end as interest_keywords,
  p.hide_location,
  case when p.id = auth.uid() or public.is_admin() then p.saved_pins else '[]'::jsonb end as saved_pins,
  p.rating_avg,
  p.rating_count,
  p.jobs_posted_count,
  p.jobs_completed_count,
  p.onboarded,
  p.top_category,
  p.created_at,
  public.is_blocked(p.id) as is_blocked
from public.profiles p;

grant select on public.public_profiles to anon, authenticated;
