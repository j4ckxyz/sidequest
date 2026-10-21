-- Jobs / applications / reviews integrity (security tester finding, verified in prod).
--
-- "posters update their own jobs" (UPDATE USING poster_id = auth.uid(), no column limits) let a
-- poster set jobs.assigned_quester_id to anyone (themselves included) and move status straight
-- to completed. That bumped jobs_completed_count (+2 when self-assigned) and unlocked reviews, so
-- counts and ratings could be faked. Posters could likewise set any application to 'accepted',
-- and applicants could INSERT an application already 'accepted'. Deleting a job never lowered
-- jobs_posted_count.
--
-- Fix, in the same shape as 0032 (profiles):
--   * column-level INSERT/UPDATE grants on jobs and applications;
--   * every status / assignee change goes through a SECURITY DEFINER RPC
--     (accept_application, start_job, complete_job, new cancel_job);
--   * BEFORE triggers as a second layer for anything a direct client write could still reach;
--   * reviews need an accepted application in both directions;
--   * jobs_posted_count decrements on delete;
--   * small hardening of handle_new_user and admin_update_profile_moderation.
--
-- The guard triggers tell a direct client write from an RPC by current_user: PostgREST requests
-- run as anon/authenticated, while SECURITY DEFINER functions (owned by postgres) and the
-- server's service-role key run as other roles. The guard functions are therefore SECURITY
-- INVOKER on purpose.

-- ---------------------------------------------------------------------------
-- 1. Column grants
-- ---------------------------------------------------------------------------

-- jobs: clients create and edit content only. DELETE stays (posters/admins delete via RLS).
-- INSERT is column-locked too: otherwise a new job could be inserted already 'completed' with
-- an assignee, which bypasses every UPDATE rule below.
revoke insert, update, truncate, references, trigger on public.jobs from anon, authenticated;
grant insert (
  poster_id, title, description, category, parish, location_detail,
  budget_type, budget_amount, estimated_hours, date_needed, is_flexible_date,
  slots, is_recurring, recurrence, location_lat, location_lng, photos
) on public.jobs to authenticated;
grant update (
  title, description, category, parish, location_detail,
  budget_type, budget_amount, estimated_hours, date_needed, is_flexible_date,
  slots, is_recurring, recurrence, location_lat, location_lng, photos
) on public.jobs to authenticated;

-- applications: apply with a message/amount; afterwards only status changes (withdraw / decline,
-- policed by guard_application_write below). Accepting goes through accept_application().
revoke insert, update, truncate, references, trigger on public.applications from anon, authenticated;
grant insert (job_id, quester_id, message, proposed_amount) on public.applications to authenticated;
grant update (status) on public.applications to authenticated;

-- moderation_actions: written only by admin_update_profile_moderation() and server/.
revoke insert, update, delete, truncate, references, trigger on public.moderation_actions from anon, authenticated;
drop policy if exists moderation_actions_admin_write on public.moderation_actions;

-- MAINTAIN (VACUUM/ANALYZE/REINDEX/REFRESH/CLUSTER/LOCK) only exists on Postgres 17+.
do $$
begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'revoke maintain on public.jobs, public.profiles from anon, authenticated';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Status / hiring RPCs
-- ---------------------------------------------------------------------------

-- Unchanged from 0010 apart from refusing to hire the poster themselves.
create or replace function public.accept_application(p_application_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_job_id uuid;
  v_quester_id uuid;
  v_app_status application_status;
  v_poster_id uuid;
  v_job_status job_status;
  v_slots int;
  v_accepted int;
begin
  select job_id, quester_id into v_job_id, v_quester_id
  from public.applications where id = p_application_id;

  if v_job_id is null then
    raise exception 'Application not found.';
  end if;

  -- Serialize hires for this job so two clicks cannot overfill the final slot.
  select poster_id, status, slots into v_poster_id, v_job_status, v_slots
  from public.jobs where id = v_job_id for update;

  if v_poster_id is distinct from auth.uid() then
    raise exception 'Only the poster can hire for this job.';
  end if;
  if v_quester_id = v_poster_id then
    raise exception 'You can''t hire yourself for your own job.';
  end if;
  if v_job_status <> 'open' then
    raise exception 'This job is no longer accepting people.';
  end if;

  select status into v_app_status from public.applications where id = p_application_id;
  if v_app_status <> 'pending' then
    raise exception 'This application has already been decided.';
  end if;

  select count(*) into v_accepted
  from public.applications where job_id = v_job_id and status = 'accepted';
  if v_accepted >= v_slots then
    raise exception 'Every spot has already been filled.';
  end if;

  update public.applications set status = 'accepted' where id = p_application_id;
  update public.jobs
    set assigned_quester_id = coalesce(assigned_quester_id, v_quester_id)
    where id = v_job_id;

  v_accepted := v_accepted + 1;
  if v_accepted >= v_slots then
    update public.applications set status = 'rejected'
      where job_id = v_job_id and status = 'pending';
    update public.jobs set status = 'assigned' where id = v_job_id;
  end if;
end;
$$;

-- start/complete: the poster or an accepted helper. The old `assigned_quester_id = auth.uid()`
-- shortcut is gone, so an assignee forged before this migration gets no rights from it.
create or replace function public.start_job(p_job_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.jobs j
    where j.id = p_job_id
      and j.status = 'assigned'
      and (j.poster_id = auth.uid() or public.is_accepted_applicant(j.id, auth.uid()))
  ) then
    raise exception 'Only the poster or an accepted helper can start this job.';
  end if;
  update public.jobs set status = 'in_progress' where id = p_job_id;
end;
$$;

create or replace function public.complete_job(p_job_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.jobs j
    where j.id = p_job_id
      and j.status in ('assigned', 'in_progress')
      and (j.poster_id = auth.uid() or public.is_accepted_applicant(j.id, auth.uid()))
  ) then
    raise exception 'Only the poster or an accepted helper can complete this job.';
  end if;
  update public.jobs set status = 'completed' where id = p_job_id;
end;
$$;

-- Replaces the client's direct `update jobs set status = 'cancelled'`.
create or replace function public.cancel_job(p_job_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_poster_id uuid;
  v_status job_status;
begin
  select poster_id, status into v_poster_id, v_status
  from public.jobs where id = p_job_id for update;

  if v_poster_id is null then
    raise exception 'Job not found.';
  end if;
  if v_poster_id is distinct from auth.uid() and not public.is_admin(auth.uid()) then
    raise exception 'Only the poster can cancel this job.';
  end if;
  if v_status not in ('open', 'assigned') then
    raise exception 'This job can''t be cancelled once it''s %.', replace(v_status::text, '_', ' ');
  end if;
  update public.jobs set status = 'cancelled' where id = p_job_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Defence in depth: guard triggers (SECURITY INVOKER, see header)
-- ---------------------------------------------------------------------------

create or replace function public.guard_job_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_client boolean := current_user in ('anon', 'authenticated');
begin
  if tg_op = 'INSERT' then
    if v_client and (new.status <> 'open' or new.assigned_quester_id is not null) then
      raise exception 'New jobs start open with nobody assigned.';
    end if;
  elsif v_client and (
       new.status is distinct from old.status
    or new.assigned_quester_id is distinct from old.assigned_quester_id
    or new.poster_id is distinct from old.poster_id
    or new.public_id is distinct from old.public_id
    or new.created_at is distinct from old.created_at
    or new.automod_checked_at is distinct from old.automod_checked_at
  ) then
    raise exception 'Job status and hiring can only change through the job actions.';
  end if;

  -- Whoever makes the change (RPC, server or client), an assignee must be a different person
  -- whose application to this job was accepted. Clearing the assignee is always allowed.
  if new.assigned_quester_id is not null
     and (tg_op = 'INSERT' or new.assigned_quester_id is distinct from old.assigned_quester_id) then
    if new.assigned_quester_id = new.poster_id then
      raise exception 'You can''t hire yourself for your own job.';
    end if;
    if not public.is_accepted_applicant(new.id, new.assigned_quester_id) then
      raise exception 'Only someone whose application was accepted can be assigned to a job.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists jobs_integrity_guard on public.jobs;
create trigger jobs_integrity_guard
  before insert or update on public.jobs
  for each row execute function public.guard_job_integrity();

-- Client writes to applications: new ones start pending; afterwards only the status moves, and
-- only pending -> withdrawn (the applicant) or pending -> rejected (the poster, per RLS).
-- accept_application() and server/ run as other roles and skip this.
create or replace function public.guard_application_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'New applications start as pending.';
    end if;
    return new;
  end if;

  if new.job_id is distinct from old.job_id
     or new.quester_id is distinct from old.quester_id
     or new.message is distinct from old.message
     or new.proposed_amount is distinct from old.proposed_amount
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an application''s status can be changed.';
  end if;

  if new.status is distinct from old.status then
    if old.status <> 'pending' then
      raise exception 'This application has already been decided.';
    end if;
    if old.quester_id = auth.uid() then
      if new.status <> 'withdrawn' then
        raise exception 'You can only withdraw your own application.';
      end if;
    elsif new.status <> 'rejected' then
      raise exception 'Use Accept to hire someone; otherwise an application can only be declined.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists applications_write_guard on public.applications;
create trigger applications_write_guard
  before insert or update on public.applications
  for each row execute function public.guard_application_write();

-- ---------------------------------------------------------------------------
-- 4. Reviews: both directions need an accepted application for the helper
-- ---------------------------------------------------------------------------

drop policy if exists "participants review completed jobs once" on public.reviews;
create policy "participants review completed jobs once" on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and reviewer_id <> reviewee_id
    and exists (
      select 1 from public.jobs j
      where j.id = job_id
        and j.status = 'completed'
        and (
          -- poster reviews a helper they hired
          (j.poster_id = auth.uid() and public.is_accepted_applicant(j.id, reviewee_id))
          -- a hired helper reviews the poster
          or (reviewee_id = j.poster_id and public.is_accepted_applicant(j.id, auth.uid()))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. jobs_posted_count goes down when a job is deleted (floor 0)
-- ---------------------------------------------------------------------------

create or replace function public.decrement_jobs_posted_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
    set jobs_posted_count = greatest(jobs_posted_count - 1, 0)
    where id = old.poster_id;
  return old;
end;
$$;

drop trigger if exists jobs_after_delete on public.jobs;
create trigger jobs_after_delete
  after delete on public.jobs
  for each row execute function public.decrement_jobs_posted_count();

-- ---------------------------------------------------------------------------
-- 6. Small fixes
-- ---------------------------------------------------------------------------

-- handle_new_user (0031) + only a real parish from metadata, and full_name capped at 80 chars.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner boolean;
  v_google boolean;
begin
  v_owner := not exists (select 1 from public.profiles)
    or new.id::text = (select value from public.app_config where key = 'owner_user_id');
  v_google := coalesce(new.raw_app_meta_data->>'provider', '') = 'google';
  insert into public.profiles (id, full_name, avatar_url, parish, is_admin, is_owner, onboarded)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 80),
    case when v_google then new.raw_user_meta_data->>'avatar_url' end,
    coalesce((select name from public.parishes where name = new.raw_user_meta_data->>'parish'), 'St Helier'),
    v_owner,
    v_owner,
    false
  );
  return new;
end;
$$;

-- admin_update_profile_moderation (0032) + bans capped at one year, a restricted admin can't act,
-- and the moderation_actions audit row is written here (decided_by = the calling admin) instead
-- of by the client.
create or replace function public.admin_update_profile_moderation(
  p_target uuid,
  p_action text,
  p_until timestamptz default null,
  p_reason text default null,
  p_is_admin boolean default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_is_owner boolean;
  v_target public.profiles;
  v_result public.profiles;
begin
  if v_caller is null or not public.is_admin(v_caller) then
    raise exception 'Only admins can do that.';
  end if;
  if public.is_blocked(v_caller) then
    raise exception 'Your own account is restricted, so you can''t moderate others.';
  end if;
  v_caller_is_owner := public.is_owner(v_caller);

  select * into v_target from public.profiles where id = p_target;
  if not found then
    raise exception 'That account no longer exists.';
  end if;
  if p_target = v_caller then
    raise exception 'You can''t change your own access or restrictions.';
  end if;
  if v_target.is_owner then
    raise exception 'The owner account can''t be changed.';
  end if;
  if v_target.is_admin and not v_caller_is_owner then
    raise exception 'Only the owner can change another admin''s account.';
  end if;

  if p_action = 'ban' then
    if p_until is null or not isfinite(p_until) or p_until <= now() then
      raise exception 'A ban needs an end time in the future.';
    end if;
    if p_until > now() + interval '1 year' then
      raise exception 'Bans can last at most a year. Use suspend for an open-ended restriction.';
    end if;
    update public.profiles
      set banned_until = p_until, ban_reason = p_reason
      where id = p_target
      returning * into v_result;
    insert into public.moderation_actions (decided_by, action, target_user_id, reason, ban_until)
      values (v_caller::text, 'ban_user', p_target, coalesce(p_reason, ''), p_until);
  elsif p_action = 'suspend' then
    update public.profiles
      set suspended = true, ban_reason = p_reason
      where id = p_target
      returning * into v_result;
    insert into public.moderation_actions (decided_by, action, target_user_id, reason)
      values (v_caller::text, 'suspend_user', p_target, coalesce(p_reason, ''));
  elsif p_action = 'unban' then
    update public.profiles
      set banned_until = null, suspended = false, ban_reason = null
      where id = p_target
      returning * into v_result;
    insert into public.moderation_actions (decided_by, action, target_user_id, reason)
      values (v_caller::text, 'unban', p_target, coalesce(p_reason, 'Lifted by admin.'));
  elsif p_action = 'set_admin' then
    if not v_caller_is_owner then
      raise exception 'Only the owner can change admin access.';
    end if;
    if p_is_admin is null then
      raise exception 'Say whether to grant or remove admin access.';
    end if;
    update public.profiles
      set is_admin = p_is_admin
      where id = p_target
      returning * into v_result;
  else
    raise exception 'Unknown moderation action: %', p_action;
  end if;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Function privileges, restated explicitly. `revoke ... from public` alone leaves the direct
--    anon/authenticated grants that Supabase's default privileges add to every new function.
-- ---------------------------------------------------------------------------

-- User-facing RPCs: signed-in users only.
revoke all on function public.accept_application(uuid) from public, anon;
revoke all on function public.start_job(uuid) from public, anon;
revoke all on function public.complete_job(uuid) from public, anon;
revoke all on function public.cancel_job(uuid) from public, anon;
grant execute on function public.accept_application(uuid) to authenticated;
grant execute on function public.start_job(uuid) to authenticated;
grant execute on function public.complete_job(uuid) to authenticated;
grant execute on function public.cancel_job(uuid) to authenticated;

revoke all on function public.admin_update_profile_moderation(uuid, text, timestamptz, text, boolean) from public, anon;
grant execute on function public.admin_update_profile_moderation(uuid, text, timestamptz, text, boolean) to authenticated, service_role;

-- Trigger-only functions: never callable as RPCs.
revoke all on function public.guard_job_integrity() from public, anon, authenticated;
revoke all on function public.guard_application_write() from public, anon, authenticated;
revoke all on function public.decrement_jobs_posted_count() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
