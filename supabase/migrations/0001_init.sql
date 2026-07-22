-- SideQuest schema — see TODO.md §3-4 for the design this implements.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums & shared constraints
-- ---------------------------------------------------------------------------
create type budget_type as enum ('fixed', 'hourly', 'negotiable');
create type job_status as enum ('open', 'assigned', 'in_progress', 'completed', 'cancelled');
create type application_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
create type notification_type as enum ('new_application', 'application_accepted', 'new_message', 'job_completed', 'new_review');

create table if not exists public.parishes (
  name text primary key
);
insert into public.parishes (name) values
  ('St Helier'), ('St Saviour'), ('St Clement'), ('Grouville'), ('St Martin'), ('Trinity'),
  ('St John'), ('St Mary'), ('St Ouen'), ('St Peter'), ('St Brelade'), ('St Lawrence')
on conflict do nothing;

-- Rows inserted by supabase/seed.sql — see TODO.md §3.7 for the full list.
create table if not exists public.job_categories (
  slug text primary key,
  label text not null,
  icon text not null
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  bio text not null default '',
  parish text not null references public.parishes (name),
  phone text,
  skills text[] not null default '{}',
  is_verified boolean not null default false,
  is_admin boolean not null default false,
  rating_avg numeric not null default 0,
  rating_count integer not null default 0,
  jobs_posted_count integer not null default 0,
  jobs_completed_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are publicly readable" on public.profiles
  for select using (true);

create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Security-definer helper so RLS policies can check admin status without recursing
-- into profiles' own RLS (the function itself bypasses RLS to read the row).
create function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

create policy "admins update any profile" on public.profiles
  for update using (public.is_admin());

-- Whichever policy let an UPDATE through, only an existing admin may actually change
-- is_admin — this is the real guard against a user promoting themselves.
create function public.protect_admin_flag()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and not public.is_admin(auth.uid()) then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_admin_flag
  before update on public.profiles
  for each row execute function public.protect_admin_flag();

-- Create a profile row whenever a new auth user signs up. The very first person to
-- ever sign up becomes an admin (see TODO.md — SideQuest is bootstrapped this way
-- rather than via a separate admin invite flow).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, parish, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'parish', 'St Helier'),
    not exists (select 1 from public.profiles)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 4 and 80),
  description text not null check (char_length(description) >= 1),
  category text not null references public.job_categories (slug),
  parish text not null references public.parishes (name),
  location_detail text,
  budget_type budget_type not null,
  budget_amount numeric check (budget_amount is null or budget_amount >= 0),
  estimated_hours numeric,
  date_needed date not null,
  is_flexible_date boolean not null default false,
  status job_status not null default 'open',
  assigned_quester_id uuid references public.profiles (id),
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint budget_amount_required check (
    budget_type = 'negotiable' or budget_amount is not null
  )
);

create index jobs_status_idx on public.jobs (status);
create index jobs_poster_idx on public.jobs (poster_id);
create index jobs_parish_idx on public.jobs (parish);
create index jobs_category_idx on public.jobs (category);

alter table public.jobs enable row level security;

create policy "open jobs are publicly readable" on public.jobs
  for select using (status = 'open' or poster_id = auth.uid() or assigned_quester_id = auth.uid());

create policy "posters insert their own jobs" on public.jobs
  for insert with check (poster_id = auth.uid());

create policy "posters update their own jobs" on public.jobs
  for update using (poster_id = auth.uid());

create policy "posters delete their own open jobs" on public.jobs
  for delete using (poster_id = auth.uid() and status = 'open');

-- Admins moderate any job regardless of status/ownership (delete spam, remove fake tasks, etc).
create policy "admins manage all jobs" on public.jobs
  for all using (public.is_admin());

-- Enforce the job status state machine server-side, not just in the UI.
create function public.enforce_job_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if (old.status, new.status) not in (
    ('open', 'assigned'), ('open', 'cancelled'),
    ('assigned', 'in_progress'), ('assigned', 'cancelled'),
    ('in_progress', 'completed')
  ) then
    raise exception 'Invalid job status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

create trigger jobs_status_transition
  before update of status on public.jobs
  for each row execute function public.enforce_job_status_transition();

-- Keep profiles.jobs_posted_count in sync.
create function public.bump_jobs_posted_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set jobs_posted_count = jobs_posted_count + 1 where id = new.poster_id;
  return new;
end;
$$;

create trigger jobs_after_insert
  after insert on public.jobs
  for each row execute function public.bump_jobs_posted_count();

create function public.bump_jobs_completed_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.profiles set jobs_completed_count = jobs_completed_count + 1 where id = new.poster_id;
    if new.assigned_quester_id is not null then
      update public.profiles set jobs_completed_count = jobs_completed_count + 1 where id = new.assigned_quester_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger jobs_after_complete
  after update of status on public.jobs
  for each row execute function public.bump_jobs_completed_count();

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  quester_id uuid not null references public.profiles (id) on delete cascade,
  message text not null default '',
  proposed_amount numeric check (proposed_amount is null or proposed_amount >= 0),
  status application_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (job_id, quester_id)
);

alter table public.applications enable row level security;

create policy "questers read own applications" on public.applications
  for select using (
    quester_id = auth.uid()
    or exists (select 1 from public.jobs j where j.id = job_id and j.poster_id = auth.uid())
  );

create policy "questers apply to jobs that aren't their own" on public.applications
  for insert with check (
    quester_id = auth.uid()
    and not exists (select 1 from public.jobs j where j.id = job_id and j.poster_id = auth.uid())
  );

create policy "questers withdraw own applications" on public.applications
  for update using (quester_id = auth.uid())
  with check (status = 'withdrawn');

create policy "posters accept or reject applications to their jobs" on public.applications
  for update using (
    exists (select 1 from public.jobs j where j.id = job_id and j.poster_id = auth.uid())
  );

-- Atomic hire flow: accept one application, auto-reject the rest, assign the job.
create function public.accept_application(p_application_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_job_id uuid;
  v_quester_id uuid;
  v_poster_id uuid;
begin
  select a.job_id, a.quester_id into v_job_id, v_quester_id
  from public.applications a where a.id = p_application_id;

  select poster_id into v_poster_id from public.jobs where id = v_job_id;

  if v_poster_id is null or v_poster_id <> auth.uid() then
    raise exception 'Only the poster can hire for this job.';
  end if;

  update public.applications set status = 'rejected'
    where job_id = v_job_id and status = 'pending' and id <> p_application_id;
  update public.applications set status = 'accepted' where id = p_application_id;
  update public.jobs set status = 'assigned', assigned_quester_id = v_quester_id where id = v_job_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- conversations & messages
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  poster_id uuid not null references public.profiles (id) on delete cascade,
  quester_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (job_id, quester_id)
);

alter table public.conversations enable row level security;

create policy "participants read their conversations" on public.conversations
  for select using (poster_id = auth.uid() or quester_id = auth.uid());

create policy "participants create their conversations" on public.conversations
  for insert with check (poster_id = auth.uid() or quester_id = auth.uid());

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy "participants read messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.poster_id = auth.uid() or c.quester_id = auth.uid())
    )
  );

create policy "participants send messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.poster_id = auth.uid() or c.quester_id = auth.uid())
    )
  );

create policy "participants mark messages read" on public.messages
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.poster_id = auth.uid() or c.quester_id = auth.uid())
    )
  );

create function public.bump_conversation_last_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (job_id, reviewer_id)
);

alter table public.reviews enable row level security;

create policy "reviews are publicly readable" on public.reviews
  for select using (true);

create policy "participants review completed jobs once" on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.jobs j
      where j.id = job_id
        and j.status = 'completed'
        and (j.poster_id = auth.uid() or j.assigned_quester_id = auth.uid())
        and reviewee_id in (j.poster_id, j.assigned_quester_id)
        and reviewee_id <> auth.uid()
    )
  );

create function public.recompute_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set
    rating_count = rating_count + 1,
    rating_avg = round(((rating_avg * rating_count) + new.rating) / (rating_count + 1)::numeric, 2)
  where id = new.reviewee_id;
  return new;
end;
$$;

create trigger reviews_after_insert
  after insert on public.reviews
  for each row execute function public.recompute_rating();

-- ---------------------------------------------------------------------------
-- notifications (v1.5 — table ready, not yet wired up in the client)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type notification_type not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "users read own notifications" on public.notifications
  for select using (user_id = auth.uid());

create policy "users mark own notifications read" on public.notifications
  for update using (user_id = auth.uid());
