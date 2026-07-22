-- Usernames, either-party job completion, and an AI-derived "best at" field.

-- ---------------------------------------------------------------------------
-- Usernames — shareable @handles. Unique, lowercase, 3–20 [a-z0-9_].
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists username text;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- Server writes this from the taste vector (nearest job category). Public-readable field.
alter table public.profiles add column if not exists top_category text;

-- Backfill the two known accounts' handles.
update public.profiles set username = 'jack'
  where username is null
    and id in (select id from auth.users where email = 'jaackgilbert88@gmail.com');
update public.profiles set username = 'jules'
  where username is null and lower(full_name) like 'jules%';

-- ---------------------------------------------------------------------------
-- Either party may mark a job done: allow assigned -> completed too, and add an
-- RPC the assigned quester (not just the poster) can call.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_job_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if (old.status, new.status) not in (
    ('open', 'assigned'), ('open', 'cancelled'),
    ('assigned', 'in_progress'), ('assigned', 'cancelled'), ('assigned', 'completed'),
    ('in_progress', 'completed')
  ) then
    raise exception 'Invalid job status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

create or replace function public.complete_job(p_job_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_poster uuid;
  v_quester uuid;
  v_status job_status;
begin
  select poster_id, assigned_quester_id, status into v_poster, v_quester, v_status
  from public.jobs where id = p_job_id;

  if v_poster is null then
    raise exception 'Job not found.';
  end if;
  if auth.uid() is distinct from v_poster and auth.uid() is distinct from v_quester then
    raise exception 'Only the poster or the hired helper can complete this job.';
  end if;
  if v_status not in ('assigned', 'in_progress') then
    raise exception 'This job is not in progress.';
  end if;

  update public.jobs set status = 'completed' where id = p_job_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Make jaack an admin (the protect_admin_flag trigger otherwise reverts this).
-- ---------------------------------------------------------------------------
alter table public.profiles disable trigger profiles_protect_admin_flag;
update public.profiles set is_admin = true
  where id in (select id from auth.users where email = 'jaackgilbert88@gmail.com');
alter table public.profiles enable trigger profiles_protect_admin_flag;
