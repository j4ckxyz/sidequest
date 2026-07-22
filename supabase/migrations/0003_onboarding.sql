-- Onboarding + Google profile capture.
-- New users (incl. Google sign-ins) start un-onboarded; the app routes them through the
-- setup flow (display name, parish, interests) before landing in the product. The signup
-- trigger now also pulls the Google display name + avatar into the profile.

alter table public.profiles add column if not exists onboarded boolean not null default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, parish, is_admin, onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'parish', 'St Helier'),
    not exists (select 1 from public.profiles),
    false
  );
  return new;
end;
$$;
