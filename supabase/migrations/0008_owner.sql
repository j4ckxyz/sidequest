-- One immutable owner (super-admin). Only the owner can grant/revoke admin, the owner can
-- never be demoted, and is_owner can't be changed through the API.

alter table public.profiles add column if not exists is_owner boolean not null default false;

-- The partial unique index permits many non-owners but never two owners.
create unique index if not exists profiles_single_owner_idx
  on public.profiles (is_owner)
  where is_owner;

create or replace function public.is_owner(uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_owner from public.profiles where id = uid), false);
$$;

-- Designate @jack as the owner (bypass the guard trigger for this one-off). The email is
-- included because it is the stable identity behind @jack, even if the handle changes later.
alter table public.profiles disable trigger profiles_protect_admin_flag;
update public.profiles set is_owner = true, is_admin = true
  where username = 'jack'
     or id in (select id from auth.users where email = 'jaackgilbert88@gmail.com');
alter table public.profiles enable trigger profiles_protect_admin_flag;

-- Admins still moderate jobs, but only the owner may edit another profile. Everyone retains
-- the existing policy that lets them edit their own non-privileged profile fields.
drop policy if exists "admins update any profile" on public.profiles;
drop policy if exists "owner updates any profile" on public.profiles;
create policy "owner updates any profile" on public.profiles
  for update using (public.is_owner()) with check (public.is_owner());

-- Rewrite the guard: is_owner is immutable; only the owner changes is_admin; owner stays admin.
create or replace function public.protect_admin_flag()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_owner is distinct from old.is_owner then
    raise exception 'The owner role cannot be changed.';
  end if;
  if new.is_admin is distinct from old.is_admin and not public.is_owner(auth.uid()) then
    raise exception 'Only the owner can change admin access.';
  end if;
  if old.is_owner and not new.is_admin then
    raise exception 'The owner cannot be removed as an admin.';
  end if;
  return new;
end;
$$;

-- On a brand-new install, the first account becomes both admin and owner. Existing installs
-- are handled by the explicit @jack backfill above.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_first boolean;
begin
  v_first := not exists (select 1 from public.profiles);
  insert into public.profiles (id, full_name, avatar_url, parish, is_admin, is_owner, onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'parish', 'St Helier'),
    v_first,
    v_first,
    false
  );
  return new;
end;
$$;
