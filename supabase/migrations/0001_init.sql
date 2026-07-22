-- ═══════════════════════════════════════════════════════════════════════════
-- JèrriConnect — initial schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- It is idempotent-ish: safe to re-run in a fresh project.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────────────────

-- One row per authenticated user. Holds their role.
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  role       text not null check (role in ('student', 'employer')),
  created_at timestamptz not null default now()
);

-- Student profile (1:1 with a 'student' profile).
create table if not exists public.students (
  id              uuid primary key references public.profiles on delete cascade,
  name            text not null default 'New student',
  headline        text not null default '',
  bio             text not null default '',
  degree          text not null default '',
  field           text,
  university      text not null default '',
  uk_city         text not null default '',
  graduation_year int,
  seeking         text not null default '',
  availability    text not null default '',
  gpa             text not null default '',
  skills          text[] not null default '{}',
  discoverable    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Portfolio items belonging to a student.
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  title      text not null,
  kind       text not null default 'Codebase',
  summary    text not null default '',
  link       text,
  link_label text,
  tags       text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Employer profile (1:1 with an 'employer' profile).
create table if not exists public.employers (
  id           uuid primary key references public.profiles on delete cascade,
  company      text not null default 'My company',
  contact_name text not null default '',
  field        text,
  about        text not null default '',
  created_at   timestamptz not null default now()
);

-- Holiday Hub opportunities, posted by employers.
create table if not exists public.opportunities (
  id          uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers on delete cascade,
  company     text not null,
  role        text not null,
  type        text not null default '1-day Shadow',
  field       text,
  location    text not null default '',
  window      text not null default '',
  paid        text not null default '',
  spots       int not null default 1,
  summary     text not null default '',
  created_at  timestamptz not null default now()
);

-- Bursaries / undergraduate schemes, posted by employers.
create table if not exists public.bursaries (
  id          uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers on delete cascade,
  provider    text not null,
  title       text not null,
  amount      text not null default '',
  field       text,                       -- a specific field, or 'Open to all'
  degrees     text[] not null default '{}',
  deadline    text not null default '',
  commitment  text not null default '',
  summary     text not null default '',
  perks       text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- Interview requests sent by employers to students.
create table if not exists public.interview_requests (
  id          uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers on delete cascade,
  student_id  uuid not null references public.students on delete cascade,
  message     text not null default '',
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  unique (employer_id, student_id)
);

-- Student applications to an opportunity or a bursary.
create table if not exists public.applications (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students on delete cascade,
  opportunity_id uuid references public.opportunities on delete cascade,
  bursary_id     uuid references public.bursaries on delete cascade,
  created_at     timestamptz not null default now(),
  check (opportunity_id is not null or bursary_id is not null)
);

create index if not exists projects_student_idx on public.projects (student_id);
create index if not exists opportunities_employer_idx on public.opportunities (employer_id);
create index if not exists bursaries_employer_idx on public.bursaries (employer_id);
create index if not exists interview_student_idx on public.interview_requests (student_id);
create index if not exists interview_employer_idx on public.interview_requests (employer_id);
create index if not exists applications_student_idx on public.applications (student_id);

-- ── New-user trigger ────────────────────────────────────────────────────────
-- When someone signs up, create their profile + role-specific row from the
-- metadata passed at sign-up. Runs as SECURITY DEFINER so it bypasses RLS.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text := coalesce(new.raw_user_meta_data ->> 'role', 'student');
begin
  insert into public.profiles (id, role) values (new.id, r);

  if r = 'employer' then
    insert into public.employers (id, company, contact_name, field)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'company', ''), 'My company'),
      coalesce(new.raw_user_meta_data ->> 'name', ''),
      new.raw_user_meta_data ->> 'field'
    );
  else
    insert into public.students (id, name, field, graduation_year)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'New student'),
      new.raw_user_meta_data ->> 'field',
      nullif(new.raw_user_meta_data ->> 'graduation_year', '')::int
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep students.updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists students_touch on public.students;
create trigger students_touch
  before update on public.students
  for each row execute function public.touch_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.profiles           enable row level security;
alter table public.students            enable row level security;
alter table public.projects            enable row level security;
alter table public.employers           enable row level security;
alter table public.opportunities       enable row level security;
alter table public.bursaries           enable row level security;
alter table public.interview_requests  enable row level security;
alter table public.applications        enable row level security;

-- profiles: a user can read and create only their own profile row.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

-- students: readable if discoverable OR it's your own row. Editable only by owner.
drop policy if exists students_select on public.students;
create policy students_select on public.students
  for select using (discoverable or id = auth.uid());
drop policy if exists students_insert_own on public.students;
create policy students_insert_own on public.students
  for insert with check (id = auth.uid());
drop policy if exists students_update_own on public.students;
create policy students_update_own on public.students
  for update using (id = auth.uid()) with check (id = auth.uid());

-- projects: visible when the parent student is visible to you; managed by owner.
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select using (
    exists (
      select 1 from public.students s
      where s.id = projects.student_id and (s.discoverable or s.id = auth.uid())
    )
  );
drop policy if exists projects_write_own on public.projects;
create policy projects_write_own on public.projects
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

-- employers: any authenticated user can read; editable only by owner.
drop policy if exists employers_select on public.employers;
create policy employers_select on public.employers
  for select using (auth.role() = 'authenticated');
drop policy if exists employers_insert_own on public.employers;
create policy employers_insert_own on public.employers
  for insert with check (id = auth.uid());
drop policy if exists employers_update_own on public.employers;
create policy employers_update_own on public.employers
  for update using (id = auth.uid()) with check (id = auth.uid());

-- opportunities: any authenticated user can read; managed by the posting employer.
drop policy if exists opportunities_select on public.opportunities;
create policy opportunities_select on public.opportunities
  for select using (auth.role() = 'authenticated');
drop policy if exists opportunities_write_own on public.opportunities;
create policy opportunities_write_own on public.opportunities
  for all using (employer_id = auth.uid()) with check (employer_id = auth.uid());

-- bursaries: same as opportunities.
drop policy if exists bursaries_select on public.bursaries;
create policy bursaries_select on public.bursaries
  for select using (auth.role() = 'authenticated');
drop policy if exists bursaries_write_own on public.bursaries;
create policy bursaries_write_own on public.bursaries
  for all using (employer_id = auth.uid()) with check (employer_id = auth.uid());

-- interview_requests: visible to the two parties; created by the employer;
-- status updatable by the student it was sent to.
drop policy if exists interview_select on public.interview_requests;
create policy interview_select on public.interview_requests
  for select using (employer_id = auth.uid() or student_id = auth.uid());
drop policy if exists interview_insert_employer on public.interview_requests;
create policy interview_insert_employer on public.interview_requests
  for insert with check (employer_id = auth.uid());
drop policy if exists interview_update_student on public.interview_requests;
create policy interview_update_student on public.interview_requests
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

-- applications: student sees their own; employer sees applications to their posts.
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications
  for select using (
    student_id = auth.uid()
    or exists (select 1 from public.opportunities o
               where o.id = applications.opportunity_id and o.employer_id = auth.uid())
    or exists (select 1 from public.bursaries b
               where b.id = applications.bursary_id and b.employer_id = auth.uid())
  );
drop policy if exists applications_insert_student on public.applications;
create policy applications_insert_student on public.applications
  for insert with check (student_id = auth.uid());
