-- Email + password sign-up. Two consequences for the signup trigger:
--
-- 1. 0022 made whoever signs up with the owner's email address the owner. With email sign-up
--    anyone can create an auth user for any address (the auth.users row, and so this trigger,
--    exists before the address is confirmed), so the owner is now pinned to a fixed user id.
-- 2. user_metadata is client-supplied on email sign-up (signUp options.data), so the avatar is
--    only taken from it for Google accounts. Privileged columns (is_admin, is_owner, banned_until,
--    suspended, ...) were never read from metadata and still aren't.

-- The owner's user id. Not exposed through the API (RLS on, no policies); edit with the SQL
-- editor if ownership ever has to move: update public.app_config set value = '<uuid>' where key = 'owner_user_id';
create table if not exists public.app_config (
  key text primary key,
  value text not null
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

-- Pin the current owner (the account 0008/0022 designated). On a fresh install there is no
-- owner yet and the first account still bootstraps as owner below.
insert into public.app_config (key, value)
select 'owner_user_id', id::text from public.profiles where is_owner
on conflict (key) do nothing;

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
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    case when v_google then new.raw_user_meta_data->>'avatar_url' end,
    coalesce(new.raw_user_meta_data->>'parish', 'St Helier'),
    v_owner,
    v_owner,
    false
  );
  return new;
end;
$$;

-- "users update own profile" lets a user update any column of their own row. Stop them clearing
-- their own ban/suspension or marking themselves verified/bot. The service role (auth.uid() is
-- null) and admins are unaffected.
create or replace function public.protect_moderation_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin(auth.uid()) and (
       new.banned_until is distinct from old.banned_until
    or new.suspended is distinct from old.suspended
    or new.ban_reason is distinct from old.ban_reason
    or new.is_verified is distinct from old.is_verified
    or new.is_bot is distinct from old.is_bot
  ) then
    raise exception 'These profile fields can only be changed by an admin.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_moderation_fields on public.profiles;
create trigger profiles_protect_moderation_fields
  before update on public.profiles
  for each row execute function public.protect_moderation_fields();

-- Trigger-only SECURITY DEFINER functions are not RPCs (see 0028). Supabase's default privileges
-- grant EXECUTE on new functions to anon/authenticated directly, so revoke from them explicitly.
-- create or replace keeps handle_new_user's existing (revoked) grants; restated here for clarity.
revoke all on function public.protect_moderation_fields() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
