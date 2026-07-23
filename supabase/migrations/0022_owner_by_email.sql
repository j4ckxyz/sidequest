-- Guarantee jaackgilbert88@gmail.com is always the owner (super-admin), even after a
-- prototype reset or a brand-new Google signup that creates a fresh auth user. Reset keeps
-- the same auth user + profile row, so is_owner/is_admin already survive it; this covers the
-- case where the account is created fresh (new auth.users row).

-- 1. New signups: if the email is the owner email, force is_admin + is_owner regardless of
--    whether it is the first account. Otherwise the first account still bootstraps as owner.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_first boolean;
  v_is_owner_email boolean;
begin
  v_first := not exists (select 1 from public.profiles);
  v_is_owner_email := lower(coalesce(new.email, '')) = 'jaackgilbert88@gmail.com';
  insert into public.profiles (id, full_name, avatar_url, parish, is_admin, is_owner, onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'parish', 'St Helier'),
    v_first or v_is_owner_email,
    v_first or v_is_owner_email,
    false
  );
  return new;
end;
$$;

-- 2. Backfill: make sure the current row for that email is owner + admin right now.
--    Bypass the immutability guard for this one-off, and clear any stale owner on a
--    different id first so the single-owner unique index can't be violated.
alter table public.profiles disable trigger profiles_protect_admin_flag;

update public.profiles set is_owner = false
where is_owner = true
  and id not in (select id from auth.users where lower(email) = 'jaackgilbert88@gmail.com');

update public.profiles set is_owner = true, is_admin = true
where id in (select id from auth.users where lower(email) = 'jaackgilbert88@gmail.com');

alter table public.profiles enable trigger profiles_protect_admin_flag;
