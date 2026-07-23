-- Allow admins to bypass rate limits (7-day username change cooldown, direct username updates,
-- AI preference chat rate limits, open job limits, and message rate limits) and clear username history
-- when resetting an admin account.

-- 1. Protect username change trigger function: allow admin accounts to bypass the direct update restriction
create or replace function public.protect_username_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Admins can update their username directly at any time (e.g. during onboarding or prototype resets)
  if coalesce(new.is_admin, false) or coalesce(old.is_admin, false) then
    return new;
  end if;

  if new.username is distinct from old.username
     and old.username is not null
     and coalesce(nullif(current_setting('sidequest.username_change_allowed', true), ''), 'false') <> 'true' then
    raise exception 'Use the username change flow. Usernames can only be changed once every 7 days.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_username_change on public.profiles;
create trigger profiles_protect_username_change
  before update of username on public.profiles
  for each row execute function public.protect_username_change();

-- 2. change_username RPC: allow admins to bypass the 7-day cooldown and handle reservations
create or replace function public.change_username(p_new text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_old text;
  v_last timestamptz;
  v_is_admin boolean := false;
  v_new_lower text := lower(p_new);
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;
  if p_new !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Username must be 3–20 characters: lowercase letters, numbers, or underscores.';
  end if;

  select username, username_changed_at, is_admin into v_old, v_last, v_is_admin
  from public.profiles where id = v_uid;

  if lower(coalesce(v_old, '')) = v_new_lower then
    return;
  end if;
  
  -- Admins bypass the 7-day cooldown
  if not coalesce(v_is_admin, false) then
    if v_last is not null and v_last > now() - interval '7 days' then
      raise exception 'You can change your username again after %.',
        to_char(v_last + interval '7 days', 'Mon DD');
    end if;
  end if;

  if exists (select 1 from public.profiles where lower(username) = v_new_lower and id <> v_uid) then
    raise exception 'That username is taken.';
  end if;
  if exists (
    select 1 from public.username_history
    where username_lower = v_new_lower and user_id <> v_uid
  ) then
    if not coalesce(v_is_admin, false) then
      raise exception 'That username is reserved.';
    end if;
  end if;

  if v_old is not null then
    insert into public.username_history (username_lower, user_id, changed_at)
    values (lower(v_old), v_uid, now())
    on conflict (username_lower) do update
      set user_id = excluded.user_id, changed_at = excluded.changed_at;
  end if;

  perform set_config('sidequest.username_change_allowed', 'true', true);
  update public.profiles
  set username = v_new_lower, username_changed_at = now()
  where id = v_uid;
end;
$$;

-- 3. Allow admins to bypass AI preference chat daily quotas
create or replace function public.claim_preference_chat_quota(
  p_user_id uuid,
  p_user_daily_limit integer,
  p_global_daily_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_is_admin boolean := false;
begin
  select is_admin into v_is_admin from public.profiles where id = p_user_id;
  
  -- Admins bypass daily quota limits
  if coalesce(v_is_admin, false) then
    return true;
  end if;

  if p_user_daily_limit < 1 or p_user_daily_limit > 1000
     or p_global_daily_limit < 1 or p_global_daily_limit > 100000 then
    raise exception 'Invalid daily limit.';
  end if;

  insert into public.ai_global_daily_usage (usage_date, preference_chat_calls)
  values ((now() at time zone 'America/Los_Angeles')::date, 1)
  on conflict (usage_date) do update
    set preference_chat_calls = public.ai_global_daily_usage.preference_chat_calls + 1
    where public.ai_global_daily_usage.preference_chat_calls < p_global_daily_limit
  returning preference_chat_calls into v_count;

  if v_count is null or v_count > p_global_daily_limit then
    return false;
  end if;

  v_count := null;

  insert into public.ai_daily_usage (user_id, usage_date, preference_chat_calls)
  values (p_user_id, (now() at time zone 'America/Los_Angeles')::date, 1)
  on conflict (user_id, usage_date) do update
    set preference_chat_calls = public.ai_daily_usage.preference_chat_calls + 1
    where public.ai_daily_usage.preference_chat_calls < p_user_daily_limit
  returning preference_chat_calls into v_count;

  if v_count is null or v_count > p_user_daily_limit then
    update public.ai_global_daily_usage
    set preference_chat_calls = greatest(preference_chat_calls - 1, 0)
    where usage_date = (now() at time zone 'America/Los_Angeles')::date;
    return false;
  end if;

  return true;
end;
$$;

-- 4. Open jobs rate limit bypass for admins
create or replace function public.limit_open_jobs()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.profiles where id = new.poster_id and is_admin = true) then
    return new;
  end if;
  if (select count(*) from public.jobs where poster_id = new.poster_id and status = 'open') >= 20 then
    raise exception 'You already have 20 open jobs — close or complete some before posting more.';
  end if;
  return new;
end;
$$;

-- 5. Message rate limit bypass for admins
create or replace function public.limit_message_rate()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.profiles where id = new.sender_id and is_admin = true) then
    return new;
  end if;
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'You are sending messages too quickly — give it a moment.';
  end if;
  return new;
end;
$$;
