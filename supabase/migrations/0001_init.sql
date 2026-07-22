-- ═══════════════════════════════════════════════════════════════════════════
-- SideQuest — schema (single unified account: everyone can post AND do quests)
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: it drops and recreates the app's objects.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Clean slate ──────────────────────────────────────────────────────────────
drop table if exists public.week_logs     cascade;
drop table if exists public.messages      cascade;
drop table if exists public.applications  cascade;
drop table if exists public.quests        cascade;
drop table if exists public.profiles      cascade;
-- legacy tables from earlier iterations, if present
drop table if exists public.doers              cascade;
drop table if exists public.posters            cascade;
drop table if exists public.interview_requests cascade;
drop table if exists public.opportunities      cascade;
drop table if exists public.bursaries          cascade;
drop table if exists public.students           cascade;
drop table if exists public.employers          cascade;
drop function if exists public.handle_new_user()          cascade;
drop function if exists public.complete_quest(uuid)       cascade;
drop function if exists public.sync_quest_counts()        cascade;
drop function if exists public.touch_updated_at()         cascade;
drop function if exists public.log_week(uuid, uuid, date) cascade;
drop function if exists public.unlog_week(uuid, uuid, date) cascade;

-- ── Tables ──────────────────────────────────────────────────────────────────

-- One profile per user. Everyone can both post quests and complete them.
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null default 'New adventurer',
  parish      text not null default '',
  bio         text not null default '',
  skills      text[] not null default '{}',
  xp          int not null default 0,
  quests_done int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Quests — the jobs on the board.
create table public.quests (
  id              uuid primary key default gen_random_uuid(),
  poster_id       uuid not null references public.profiles on delete cascade,
  title           text not null,
  description     text not null default '',
  category        text not null default 'Other',
  type            text not null default 'single' check (type in ('single', 'weekly')),
  parish          text not null default '',
  reward          int not null default 0,
  xp_reward       int not null default 30,
  schedule        text not null default '',
  party_size      int not null default 1,
  applicant_count int not null default 0,
  accepted_count  int not null default 0,
  status          text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  created_at      timestamptz not null default now()
);

-- Applications — a profile applying to someone else's quest.
create table public.applications (
  id         uuid primary key default gen_random_uuid(),
  quest_id   uuid not null references public.quests on delete cascade,
  doer_id    uuid not null references public.profiles on delete cascade,
  message    text not null default '',
  status     text not null default 'applied' check (status in ('applied', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (quest_id, doer_id)
);

-- Safe-Chat: one private thread per (quest, doer) between the poster and one doer.
create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  quest_id    uuid not null references public.quests on delete cascade,
  doer_id     uuid not null references public.profiles on delete cascade,
  sender_id   uuid not null references public.profiles on delete cascade,
  sender_name text not null default '',
  body        text not null,
  created_at  timestamptz not null default now()
);

-- Weekly completion log — one row per week a doer completed a weekly quest.
create table public.week_logs (
  id         uuid primary key default gen_random_uuid(),
  quest_id   uuid not null references public.quests on delete cascade,
  doer_id    uuid not null references public.profiles on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  unique (quest_id, doer_id, week_start)
);

create index quests_parish_idx on public.quests (parish);
create index quests_status_idx on public.quests (status);
create index quests_poster_idx on public.quests (poster_id);
create index applications_quest_idx on public.applications (quest_id);
create index applications_doer_idx on public.applications (doer_id);
create index messages_thread_idx on public.messages (quest_id, doer_id, created_at);
create index week_logs_quest_idx on public.week_logs (quest_id, doer_id);

-- ── New-user trigger ─────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, parish)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'New adventurer'),
    coalesce(new.raw_user_meta_data ->> 'parish', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ── Keep quest applicant / accepted counts in sync ───────────────────────────
create or replace function public.sync_quest_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare qid uuid := coalesce(new.quest_id, old.quest_id);
begin
  update public.quests set
    applicant_count = (select count(*) from public.applications where quest_id = qid),
    accepted_count  = (select count(*) from public.applications where quest_id = qid and status = 'accepted')
  where id = qid;
  return null;
end;
$$;
create trigger applications_count
  after insert or update or delete on public.applications
  for each row execute function public.sync_quest_counts();

-- ── Single-time: complete and release XP to accepted doers (poster only) ─────
create or replace function public.complete_quest(p_quest uuid)
returns void language plpgsql security definer set search_path = public as $$
declare q record;
begin
  select * into q from public.quests where id = p_quest;
  if q is null then raise exception 'Quest not found'; end if;
  if q.poster_id <> auth.uid() then raise exception 'Not your quest'; end if;
  if q.type = 'weekly' then
    raise exception 'Weekly quests are logged per week, not completed';
  end if;

  update public.quests set status = 'completed' where id = p_quest;

  update public.profiles p
    set xp = p.xp + q.xp_reward, quests_done = p.quests_done + 1
    from public.applications a
    where a.quest_id = p_quest and a.status = 'accepted' and a.doer_id = p.id;
end;
$$;
grant execute on function public.complete_quest(uuid) to authenticated;

-- ── Weekly: log / unlog a week (poster only), awarding / deducting XP ─────────
create or replace function public.log_week(p_quest uuid, p_doer uuid, p_week date)
returns void language plpgsql security definer set search_path = public as $$
declare q record; inserted boolean := false;
begin
  select * into q from public.quests where id = p_quest;
  if q is null then raise exception 'Quest not found'; end if;
  if q.poster_id <> auth.uid() then raise exception 'Not your quest'; end if;

  insert into public.week_logs (quest_id, doer_id, week_start)
  values (p_quest, p_doer, p_week)
  on conflict (quest_id, doer_id, week_start) do nothing;
  get diagnostics inserted = row_count;

  if inserted then
    update public.profiles set xp = xp + q.xp_reward, quests_done = quests_done + 1
    where id = p_doer;
  end if;
end;
$$;
grant execute on function public.log_week(uuid, uuid, date) to authenticated;

create or replace function public.unlog_week(p_quest uuid, p_doer uuid, p_week date)
returns void language plpgsql security definer set search_path = public as $$
declare q record; removed int := 0;
begin
  select * into q from public.quests where id = p_quest;
  if q is null then raise exception 'Quest not found'; end if;
  if q.poster_id <> auth.uid() then raise exception 'Not your quest'; end if;

  delete from public.week_logs
  where quest_id = p_quest and doer_id = p_doer and week_start = p_week;
  get diagnostics removed = row_count;

  if removed > 0 then
    update public.profiles
      set xp = greatest(0, xp - q.xp_reward),
          quests_done = greatest(0, quests_done - 1)
    where id = p_doer;
  end if;
end;
$$;
grant execute on function public.unlog_week(uuid, uuid, date) to authenticated;

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles     enable row level security;
alter table public.quests       enable row level security;
alter table public.applications enable row level security;
alter table public.messages     enable row level security;
alter table public.week_logs    enable row level security;

-- profiles: everyone signed in can read (to show names + applicant profiles);
-- you may only create/edit your own.
create policy profiles_select on public.profiles
  for select using (auth.uid() is not null);
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- quests: everyone signed in sees the board; only the poster manages theirs.
create policy quests_select on public.quests
  for select using (auth.uid() is not null);
create policy quests_write_own on public.quests
  for all using (poster_id = auth.uid()) with check (poster_id = auth.uid());

-- applications: doer sees own; poster sees applications to their quests.
create policy applications_select on public.applications
  for select using (
    doer_id = auth.uid()
    or exists (select 1 from public.quests q where q.id = applications.quest_id and q.poster_id = auth.uid())
  );
create policy applications_insert_doer on public.applications
  for insert with check (doer_id = auth.uid());
create policy applications_update on public.applications
  for update using (
    doer_id = auth.uid()
    or exists (select 1 from public.quests q where q.id = applications.quest_id and q.poster_id = auth.uid())
  );

-- messages: each private (quest, doer) thread — the quest's poster and that doer.
create policy messages_select on public.messages
  for select using (
    doer_id = auth.uid()
    or exists (select 1 from public.quests q where q.id = messages.quest_id and q.poster_id = auth.uid())
  );
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      doer_id = auth.uid()
      or exists (select 1 from public.quests q where q.id = messages.quest_id and q.poster_id = auth.uid())
    )
  );

-- week_logs: visible to the quest's poster and the doer; written only via RPC.
create policy week_logs_select on public.week_logs
  for select using (
    doer_id = auth.uid()
    or exists (select 1 from public.quests q where q.id = week_logs.quest_id and q.poster_id = auth.uid())
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.messages;
