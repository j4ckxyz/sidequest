-- Moderation: user reports, an autonomous Gemini agent's decisions, and its
-- live status stream (shown in the admin dashboard). Enforcement lives on
-- profiles (banned_until / suspended / ban_reason).

alter table profiles add column if not exists banned_until timestamptz;
alter table profiles add column if not exists suspended boolean not null default false;
alter table profiles add column if not exists ban_reason text;

-- ── Reports ──────────────────────────────────────────────────────────────
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('job','user')),
  target_id text not null,
  target_user_id uuid not null references profiles(id) on delete cascade,
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending','reviewing','resolved')),
  created_at timestamptz not null default now()
);
create index if not exists reports_target_user_idx on reports (target_user_id, created_at desc);
alter table reports enable row level security;

-- Anyone signed in can file a report; only admins read them.
drop policy if exists reports_insert_self on reports;
create policy reports_insert_self on reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists reports_admin_read on reports;
create policy reports_admin_read on reports
  for select using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- ── Moderation actions (enforcement record) ──────────────────────────────
create table if not exists moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete set null,
  decided_by text not null,            -- 'gemini' or an admin user id
  action text not null check (action in ('dismiss','remove_post','ban_user','suspend_user','unban')),
  target_user_id uuid references profiles(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  reason text not null default '',
  ban_until timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists moderation_actions_target_idx on moderation_actions (target_user_id, created_at desc);
alter table moderation_actions enable row level security;

drop policy if exists moderation_actions_admin_read on moderation_actions;
create policy moderation_actions_admin_read on moderation_actions
  for select using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
-- Rows are written by the server (service role) and by the admin manual controls.
drop policy if exists moderation_actions_admin_write on moderation_actions;
create policy moderation_actions_admin_write on moderation_actions
  for insert with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- ── Agent live status stream ─────────────────────────────────────────────
create table if not exists moderation_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  kind text not null,
  message text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists moderation_events_created_idx on moderation_events (created_at desc);
alter table moderation_events enable row level security;

drop policy if exists moderation_events_admin_read on moderation_events;
create policy moderation_events_admin_read on moderation_events
  for select using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- Stream the agent's steps + new reports live to the admin dashboard.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table moderation_events; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table reports; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table moderation_actions; exception when duplicate_object then null; end;
  end if;
end$$;
