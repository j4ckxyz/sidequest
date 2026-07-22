-- Short, non-guessable, roughly time-sortable public id for jobs, used in
-- shareable URLs: /job/:username/:public_id.
--
-- The id is an Instagram-style snowflake (custom epoch + rolling sequence)
-- encoded base62, so it stays short (~9 chars), sorts by age, and is not
-- trivially enumerable. Additive + idempotent — safe to re-run.

-- Rolling sequence for the low bits (uniqueness within a millisecond).
create sequence if not exists job_public_seq;

-- base62 encode a non-negative bigint.
create or replace function base62_encode(n bigint)
returns text
language plpgsql
immutable
as $$
declare
  alphabet text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  result text := '';
  r int;
begin
  if n is null then return null; end if;
  if n = 0 then return '0'; end if;
  while n > 0 loop
    r := (n % 62)::int;
    result := substr(alphabet, r + 1, 1) || result;
    n := n / 62;
  end loop;
  return result;
end;
$$;

-- Generate a fresh public id: ((ms since 2024-01-01) << 13) | seq, base62-encoded.
create or replace function gen_job_public_id()
returns text
language plpgsql
volatile
as $$
declare
  epoch bigint := 1704067200000; -- 2024-01-01T00:00:00Z in ms
  now_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  flake bigint := ((now_ms - epoch) << 13) | (nextval('job_public_seq') % 8192);
begin
  return base62_encode(flake);
end;
$$;

-- Add the column, backfill existing rows, then enforce default + uniqueness.
alter table jobs add column if not exists public_id text;
update jobs set public_id = gen_job_public_id() where public_id is null;
alter table jobs alter column public_id set default gen_job_public_id();
create unique index if not exists jobs_public_id_key on jobs (public_id);
alter table jobs alter column public_id set not null;
