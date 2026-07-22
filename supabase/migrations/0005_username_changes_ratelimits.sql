-- Username changes (with history so old @handles keep resolving and stay reserved) +
-- DB-level spam guards. All relational data references profiles.id, never the username, so
-- a change never orphans jobs/applications/reviews/messages.

alter table public.profiles add column if not exists username_changed_at timestamptz;

-- Every past handle a user has held. Kept unique + public so old /u/<handle> links still
-- resolve and nobody can grab someone else's former handle to impersonate them.
create table if not exists public.username_history (
  username_lower text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  changed_at timestamptz not null default now()
);
alter table public.username_history enable row level security;
create policy "username history is publicly readable" on public.username_history
  for select using (true);
-- Writes happen only inside change_username (security definer) / via the service key.

-- Change the caller's username: validate, enforce a 7-day cooldown, keep it unique + not
-- reserved, archive the old handle, then set the new one. Cooldown = the rate limit; being
-- server-side it can't be bypassed by a hostile client.
create or replace function public.change_username(p_new text)
returns void
language plpgsql
security definer set search_path = public
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

  select username, username_changed_at into v_old, v_last from public.profiles where id = v_uid;

  if lower(coalesce(v_old, '')) = v_new_lower then
    return; -- no change
  end if;
  if v_last is not null and v_last > now() - interval '7 days' then
    raise exception 'You can change your username again after %.', to_char(v_last + interval '7 days', 'Mon DD');
  end if;
  if exists (select 1 from public.profiles where lower(username) = v_new_lower and id <> v_uid) then
    raise exception 'That username is taken.';
  end if;
  if exists (select 1 from public.username_history where username_lower = v_new_lower and user_id <> v_uid) then
    raise exception 'That username is reserved.';
  end if;

  if v_old is not null then
    insert into public.username_history (username_lower, user_id, changed_at)
    values (lower(v_old), v_uid, now())
    on conflict (username_lower) do update set user_id = excluded.user_id, changed_at = excluded.changed_at;
  end if;

  update public.profiles set username = v_new_lower, username_changed_at = now() where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Spam guards on the two open-ended write paths. (reviews are already 1-per-job via a
-- unique constraint, and applications are 1-per-job — both naturally un-spammable.)
-- ---------------------------------------------------------------------------

-- Cap concurrent open jobs per poster so nobody can flood the board.
create or replace function public.limit_open_jobs()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.jobs where poster_id = new.poster_id and status = 'open') >= 20 then
    raise exception 'You already have 20 open jobs — close or complete some before posting more.';
  end if;
  return new;
end;
$$;
drop trigger if exists jobs_limit_open on public.jobs;
create trigger jobs_limit_open before insert on public.jobs
  for each row execute function public.limit_open_jobs();

-- Throttle message floods (generous: 20 per minute per sender).
create or replace function public.limit_message_rate()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'You are sending messages too quickly — give it a moment.';
  end if;
  return new;
end;
$$;
drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit before insert on public.messages
  for each row execute function public.limit_message_rate();
