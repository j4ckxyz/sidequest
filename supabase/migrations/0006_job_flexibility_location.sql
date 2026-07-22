-- Optional date (esp. when flexible), recurring jobs, and an optional map pin (Jersey-locked).

-- Date is no longer required — a flexible job may have no fixed date.
alter table public.jobs alter column date_needed drop not null;

-- Recurring jobs (e.g. weekly).
alter table public.jobs add column if not exists is_recurring boolean not null default false;
alter table public.jobs add column if not exists recurrence text;

-- Optional precise pin. Constrained to Jersey's bounding box so it can't be set elsewhere.
alter table public.jobs add column if not exists location_lat double precision;
alter table public.jobs add column if not exists location_lng double precision;
alter table public.jobs
  add constraint jobs_location_jersey check (
    (location_lat is null and location_lng is null)
    or (location_lat between 49.15 and 49.27 and location_lng between -2.27 and -1.99)
  );
