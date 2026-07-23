-- Reconcile a legacy notifications table with the 0014 shape.
--
-- 0001_init.sql created `notifications` with:
--   • user_id  uuid NOT NULL            (never written by the 0014 triggers)
--   • payload  jsonb NOT NULL           (never written by the 0014 triggers)
--   • type     notification_type (enum, lacks 'application_rejected')
--
-- 0014_notifications.sql uses `create table if not exists`, so on any DB that
-- already ran 0001 those legacy columns survive untouched. The new triggers
-- insert (recipient_id, type, title, …) with no user_id, so the first message
-- or application after upgrading fails with:
--   null value in column "user_id" of relation "notifications" violates not-null constraint
--
-- This migration relaxes the legacy columns so both the legacy schema and the
-- fresh-0014 schema converge. Every step is guarded, so it is a no-op on a DB
-- that was created fresh from 0014 (no user_id/payload column, type already text).

do $$
begin
  -- Legacy NOT NULL user_id — drop the constraint and backfill from recipient_id
  -- so any legacy reader (old RLS policy keys on user_id) still sees the row.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'user_id'
  ) then
    alter table public.notifications alter column user_id drop not null;
    update public.notifications
      set user_id = recipient_id
      where user_id is null and recipient_id is not null;
  end if;

  -- Legacy NOT NULL payload — new triggers never populate it.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'payload'
  ) then
    alter table public.notifications alter column payload drop not null;
  end if;

  -- Legacy enum `type` is missing 'application_rejected'. Convert to text to
  -- match the 0014 shape (a CHECK constraint there already whitelists values).
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications'
      and column_name = 'type' and data_type = 'USER-DEFINED'
  ) then
    alter table public.notifications alter column type set data type text using type::text;
  end if;
end$$;
