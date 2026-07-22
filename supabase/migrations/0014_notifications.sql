-- Notifications + web-push subscriptions.
--
-- Notification rows are created DB-side by SECURITY DEFINER triggers (so they
-- work even though the webapp writes applications/messages directly via the
-- anon client under RLS). The recs server watches inserts over Realtime and
-- fans out web-push to the recipient's subscriptions.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('new_application','new_message','application_accepted','application_rejected')),
  title text not null,
  body text not null default '',
  link text not null default '',
  job_id uuid references jobs(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Ensure columns exist if the table was created by a prior schema
alter table notifications add column if not exists recipient_id uuid references profiles(id) on delete cascade;
alter table notifications add column if not exists type text;
alter table notifications add column if not exists title text;
alter table notifications add column if not exists body text default '';
alter table notifications add column if not exists link text default '';
alter table notifications add column if not exists job_id uuid references jobs(id) on delete cascade;
alter table notifications add column if not exists actor_id uuid references profiles(id) on delete set null;
alter table notifications add column if not exists read_at timestamptz;

create index if not exists notifications_recipient_created_idx
  on notifications (recipient_id, created_at desc);

alter table notifications enable row level security;

-- Recipients read and update (mark read) only their own notifications.
drop policy if exists notifications_select_own on notifications;
create policy notifications_select_own on notifications
  for select using (auth.uid() = recipient_id);

drop policy if exists notifications_update_own on notifications;
create policy notifications_update_own on notifications
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
-- No client insert policy: rows are only created by the triggers below.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;

drop policy if exists push_subscriptions_manage_own on push_subscriptions;
create policy push_subscriptions_manage_own on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Notification triggers ────────────────────────────────────────────────

-- New application → notify the job's poster.
create or replace function notify_on_application_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j jobs%rowtype;
  actor_name text;
begin
  select * into j from jobs where id = new.job_id;
  if not found then return new; end if;
  if j.poster_id = new.quester_id then return new; end if;
  select coalesce(full_name, 'Someone') into actor_name from profiles where id = new.quester_id;
  insert into notifications (recipient_id, type, title, body, link, job_id, actor_id)
  values (
    j.poster_id,
    'new_application',
    'New application',
    actor_name || ' applied to “' || j.title || '”',
    '/jobs/' || j.id,
    j.id,
    new.quester_id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_application_insert on applications;
create trigger trg_notify_application_insert
  after insert on applications
  for each row execute function notify_on_application_insert();

-- Application accepted / rejected → notify the applicant.
create or replace function notify_on_application_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j jobs%rowtype;
begin
  if new.status = old.status then return new; end if;
  if new.status not in ('accepted','rejected') then return new; end if;
  select * into j from jobs where id = new.job_id;
  if not found then return new; end if;
  insert into notifications (recipient_id, type, title, body, link, job_id, actor_id)
  values (
    new.quester_id,
    ('application_' || new.status),
    case when new.status = 'accepted' then 'You’re hired' else 'Application update' end,
    case when new.status = 'accepted'
      then 'You were accepted for “' || j.title || '”'
      else 'Your application for “' || j.title || '” wasn’t chosen this time'
    end,
    '/jobs/' || j.id,
    j.id,
    j.poster_id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_application_status on applications;
create trigger trg_notify_application_status
  after update on applications
  for each row execute function notify_on_application_status();

-- New message → notify the other participant in the conversation.
create or replace function notify_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversations%rowtype;
  recipient uuid;
  actor_name text;
begin
  select * into c from conversations where id = new.conversation_id;
  if not found then return new; end if;
  recipient := case when new.sender_id = c.poster_id then c.quester_id else c.poster_id end;
  if recipient = new.sender_id then return new; end if;
  select coalesce(full_name, 'Someone') into actor_name from profiles where id = new.sender_id;
  insert into notifications (recipient_id, type, title, body, link, job_id, actor_id)
  values (
    recipient,
    'new_message',
    'New message',
    actor_name || ': ' || left(new.body, 120),
    '/messages/' || c.id,
    c.job_id,
    new.sender_id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_message_insert on messages;
create trigger trg_notify_message_insert
  after insert on messages
  for each row execute function notify_on_message_insert();

-- Let the recs server stream new notifications over Realtime.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table notifications;
    exception when duplicate_object then null;
    end;
  end if;
end$$;
