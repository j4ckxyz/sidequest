-- Private, resumable job preferences for the settings assistant, plus durable Gemini quotas.
-- The public profile view also enforces hide_location at the data boundary instead of relying
-- on the UI to omit a parish that was still queryable from the profiles table.

create table if not exists public.job_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  preferred_categories text[] not null default '{}',
  summary text not null default '' check (char_length(summary) <= 2000),
  keywords text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.job_preferences enable row level security;
-- No client policies: the signed-in user reaches this table through the recommendations
-- service, which validates their Supabase token. The service role owns all reads/writes.

create table if not exists public.job_preference_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists job_preference_messages_user_id_idx
  on public.job_preference_messages (user_id, id desc);

alter table public.job_preference_messages enable row level security;
-- Conversation history is private and service-only, like job_preferences.

create table if not exists public.ai_daily_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_date date not null default (now() at time zone 'America/Los_Angeles')::date,
  preference_chat_calls integer not null default 0 check (preference_chat_calls >= 0),
  primary key (user_id, usage_date)
);

alter table public.ai_daily_usage enable row level security;

create table if not exists public.ai_global_daily_usage (
  usage_date date primary key default (now() at time zone 'America/Los_Angeles')::date,
  preference_chat_calls integer not null default 0 check (preference_chat_calls >= 0)
);

alter table public.ai_global_daily_usage enable row level security;

-- Save the non-AI settings atomically as well, so topic choices and the privacy toggle cannot
-- drift apart if a request is interrupted halfway through.
create or replace function public.save_job_preferences(
  p_user_id uuid,
  p_preferred_categories text[],
  p_hide_location boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from unnest(p_preferred_categories) as selected(category)
    left join public.job_categories known on known.slug = selected.category
    where known.slug is null
  ) then
    raise exception 'One or more job topics are invalid.';
  end if;

  insert into public.job_preferences (user_id, preferred_categories, updated_at)
  values (p_user_id, p_preferred_categories, now())
  on conflict (user_id) do update
    set preferred_categories = excluded.preferred_categories,
        updated_at = excluded.updated_at;

  update public.profiles set hide_location = p_hide_location where id = p_user_id;
end;
$$;

revoke all on function public.save_job_preferences(uuid, text[], boolean) from public;
grant execute on function public.save_job_preferences(uuid, text[], boolean) to service_role;

-- Atomically claim one daily chat call. Only the service role can execute this, so a client
-- cannot consume somebody else's allowance. Counting before the upstream call is deliberate:
-- repeated failed/aborted requests must not become a way to hammer the Gemini free tier.
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
begin
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

revoke all on function public.claim_preference_chat_quota(uuid, integer, integer) from public;
grant execute on function public.claim_preference_chat_quota(uuid, integer, integer) to service_role;

-- Store the two messages and the new compact brief as one transaction. Topic choices are kept
-- intact when a chat turn updates the summary.
create or replace function public.save_preference_chat_turn(
  p_user_id uuid,
  p_user_message text,
  p_assistant_message text,
  p_summary text,
  p_keywords text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.job_preference_messages (user_id, role, content)
  values
    (p_user_id, 'user', p_user_message),
    (p_user_id, 'assistant', p_assistant_message);

  insert into public.job_preferences (user_id, summary, keywords, updated_at)
  values (p_user_id, p_summary, p_keywords, now())
  on conflict (user_id) do update
    set summary = excluded.summary,
        keywords = excluded.keywords,
        updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.save_preference_chat_turn(uuid, text, text, text, text[]) from public;
grant execute on function public.save_preference_chat_turn(uuid, text, text, text, text[]) to service_role;

-- Enforce the username cooldown even against a hand-written Supabase UPDATE. The first username
-- chosen during onboarding is allowed; every later change must pass through change_username().
create or replace function public.protect_username_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.username is distinct from old.username
     and old.username is not null
     and coalesce(current_setting('sidequest.username_change_allowed', true), 'false') <> 'true' then
    raise exception 'Use the username change flow. Usernames can only be changed once every 7 days.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_username_change on public.profiles;
create trigger profiles_protect_username_change
  before update of username on public.profiles
  for each row execute function public.protect_username_change();

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
  v_new_lower text := lower(p_new);
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;
  if p_new !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Username must be 3–20 characters: lowercase letters, numbers, or underscores.';
  end if;

  select username, username_changed_at into v_old, v_last
  from public.profiles where id = v_uid;

  if lower(coalesce(v_old, '')) = v_new_lower then
    return;
  end if;
  if v_last is not null and v_last > now() - interval '7 days' then
    raise exception 'You can change your username again after %.',
      to_char(v_last + interval '7 days', 'Mon DD');
  end if;
  if exists (select 1 from public.profiles where lower(username) = v_new_lower and id <> v_uid) then
    raise exception 'That username is taken.';
  end if;
  if exists (
    select 1 from public.username_history
    where username_lower = v_new_lower and user_id <> v_uid
  ) then
    raise exception 'That username is reserved.';
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

-- Profiles used to be completely public, which meant hide_location was only cosmetic.
-- Direct table reads are now limited to the owner/admin. Everyone else reads this view,
-- where private location and matching-only fields are redacted before leaving Postgres.
drop policy if exists "profiles are publicly readable" on public.profiles;
drop policy if exists "users and admins read private profiles" on public.profiles;
create policy "users and admins read private profiles" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

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
  p.created_at
from public.profiles p;

grant select on public.public_profiles to anon, authenticated;
