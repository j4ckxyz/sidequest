-- Security finding H-1: signed-in users could UPDATE any column of their own profiles row.
-- RLS limits them to their own row and the protect_admin_flag / protect_moderation_fields
-- triggers block the admin and moderation columns, but rating_avg, rating_count,
-- jobs_posted_count, jobs_completed_count, username_changed_at (bypassing change_username's
-- 7-day limit) and created_at were all writable, and anon/authenticated held table-wide
-- INSERT/UPDATE.
--
-- Fix: column-level privileges. Clients may only update the columns the app edits directly:
--   full_name, avatar_url, bio, parish, phone, skills   profile edit (+ Google avatar backfill)
--   saved_pins                                          saved locations on the job form
--   onboarded                                           finishing onboarding
-- Everything else changes only through SECURITY DEFINER functions (owned by postgres, so
-- unaffected by these grants) or the server's service-role key:
--   username / username_changed_at   change_username(), admin_free_username()
--   hide_location / job preferences  save_job_preferences() via server/
--   interest_keywords, top_category  server/ (service role)
--   rating_*, jobs_*_count           recompute_rating / bump_jobs_* triggers
--   is_admin, banned_until, suspended, ban_reason   admin_update_profile_moderation() below
--   is_owner, is_verified, is_bot    no client path at all (SQL editor / service role only)
-- Rows are created only by the handle_new_user trigger, never by the client.
-- protect_admin_flag and protect_moderation_fields stay as a second layer. SELECT grants, RLS
-- policies and the public_profiles view are deliberately left untouched.

-- 1. Drop table-wide write privileges. DELETE/TRUNCATE/REFERENCES/TRIGGER go too: the client
--    never deletes profiles (account deletion runs server-side) and TRUNCATE ignores RLS.
revoke insert, update, delete, truncate, references, trigger on public.profiles from anon, authenticated;

-- 2. Re-grant UPDATE on just the self-editable columns, to signed-in users only.
grant update (full_name, avatar_url, bio, parish, phone, skills, saved_pins, onboarded)
  on public.profiles to authenticated;

-- 3. Admin moderation that used to write protected columns straight from the client.
--    Same rules the app already enforced: any admin may moderate regular users; only the owner
--    may moderate another admin or change admin access; nobody can target the owner or
--    themselves. is_owner is never writable (protect_admin_flag also rejects it).
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
    if p_until is null or p_until <= now() then
      raise exception 'A ban needs an end time in the future.';
    end if;
    update public.profiles
      set banned_until = p_until, ban_reason = p_reason
      where id = p_target
      returning * into v_result;
  elsif p_action = 'suspend' then
    update public.profiles
      set suspended = true, ban_reason = p_reason
      where id = p_target
      returning * into v_result;
  elsif p_action = 'unban' then
    update public.profiles
      set banned_until = null, suspended = false, ban_reason = null
      where id = p_target
      returning * into v_result;
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

-- Supabase's default privileges grant EXECUTE to anon/authenticated directly, so revoking from
-- PUBLIC alone wouldn't remove anon's.
revoke all on function public.admin_update_profile_moderation(uuid, text, timestamptz, text, boolean) from public, anon;
grant execute on function public.admin_update_profile_moderation(uuid, text, timestamptz, text, boolean) to authenticated, service_role;

-- Verification (run manually after applying; every row should be true):
--
-- select
--   has_column_privilege('authenticated', 'public.profiles', 'bio', 'UPDATE')                     as auth_can_update_bio,
--   has_column_privilege('authenticated', 'public.profiles', 'saved_pins', 'UPDATE')              as auth_can_update_saved_pins,
--   not has_column_privilege('authenticated', 'public.profiles', 'rating_avg', 'UPDATE')          as auth_cannot_update_rating_avg,
--   not has_column_privilege('authenticated', 'public.profiles', 'rating_count', 'UPDATE')        as auth_cannot_update_rating_count,
--   not has_column_privilege('authenticated', 'public.profiles', 'jobs_posted_count', 'UPDATE')   as auth_cannot_update_jobs_posted,
--   not has_column_privilege('authenticated', 'public.profiles', 'jobs_completed_count', 'UPDATE') as auth_cannot_update_jobs_completed,
--   not has_column_privilege('authenticated', 'public.profiles', 'username', 'UPDATE')            as auth_cannot_update_username,
--   not has_column_privilege('authenticated', 'public.profiles', 'username_changed_at', 'UPDATE') as auth_cannot_update_username_changed_at,
--   not has_column_privilege('authenticated', 'public.profiles', 'created_at', 'UPDATE')          as auth_cannot_update_created_at,
--   not has_column_privilege('authenticated', 'public.profiles', 'is_admin', 'UPDATE')            as auth_cannot_update_is_admin,
--   not has_column_privilege('authenticated', 'public.profiles', 'banned_until', 'UPDATE')        as auth_cannot_update_banned_until,
--   not has_table_privilege('authenticated', 'public.profiles', 'INSERT')                         as auth_cannot_insert,
--   not has_any_column_privilege('anon', 'public.profiles', 'UPDATE')                             as anon_cannot_update_anything,
--   not has_any_column_privilege('anon', 'public.profiles', 'INSERT')                             as anon_cannot_insert,
--   has_table_privilege('authenticated', 'public.profiles', 'SELECT')                             as auth_select_unchanged,
--   not has_function_privilege('anon', 'public.admin_update_profile_moderation(uuid, text, timestamptz, text, boolean)', 'EXECUTE') as anon_cannot_moderate,
--   has_function_privilege('authenticated', 'public.admin_update_profile_moderation(uuid, text, timestamptz, text, boolean)', 'EXECUTE') as auth_can_call_moderation_rpc;
--
-- Functions that write profiles must stay SECURITY DEFINER and owned by postgres (expect 0 rows):
--
-- select p.proname, pg_get_userbyid(p.proowner) as owner, p.prosecdef
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('handle_new_user', 'bump_jobs_posted_count', 'bump_jobs_completed_count',
--                     'recompute_rating', 'change_username', 'admin_free_username',
--                     'save_job_preferences', 'admin_update_profile_moderation')
--   and (not p.prosecdef or pg_get_userbyid(p.proowner) <> 'postgres');
