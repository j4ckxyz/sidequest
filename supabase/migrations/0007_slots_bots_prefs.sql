-- Multi-person jobs (slots), bot accounts, interest keywords, hide-location, saved pins.

alter table public.jobs add column if not exists slots int not null default 1 check (slots between 1 and 20);

alter table public.profiles add column if not exists is_bot boolean not null default false;
alter table public.profiles add column if not exists interest_keywords text[] not null default '{}';
alter table public.profiles add column if not exists hide_location boolean not null default false;
alter table public.profiles add column if not exists saved_pins jsonb not null default '[]'::jsonb;

-- Accepted applicants must still be able to read the job once it closes (assigned).
drop policy if exists "open jobs are publicly readable" on public.jobs;
create policy "open jobs are publicly readable" on public.jobs
  for select using (
    status = 'open'
    or poster_id = auth.uid()
    or assigned_quester_id = auth.uid()
    or exists (
      select 1 from public.applications a
      where a.job_id = id and a.quester_id = auth.uid() and a.status = 'accepted'
    )
  );

-- Hire flow with slots: accept one application, fill a slot; only when every slot is filled
-- do we reject the remaining applicants and close the job to new applications.
create or replace function public.accept_application(p_application_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_job_id uuid;
  v_quester_id uuid;
  v_poster_id uuid;
  v_slots int;
  v_accepted int;
begin
  select a.job_id, a.quester_id into v_job_id, v_quester_id
  from public.applications a where a.id = p_application_id;

  select poster_id, slots into v_poster_id, v_slots from public.jobs where id = v_job_id;

  if v_poster_id is null or v_poster_id <> auth.uid() then
    raise exception 'Only the poster can hire for this job.';
  end if;

  update public.applications set status = 'accepted' where id = p_application_id and status = 'pending';

  -- Keep assigned_quester_id pointing at the first hire (single-helper UI + messaging).
  update public.jobs set assigned_quester_id = coalesce(assigned_quester_id, v_quester_id) where id = v_job_id;

  select count(*) into v_accepted from public.applications where job_id = v_job_id and status = 'accepted';
  if v_accepted >= v_slots then
    update public.applications set status = 'rejected' where job_id = v_job_id and status = 'pending';
    update public.jobs set status = 'assigned' where id = v_job_id and status = 'open';
  end if;
end;
$$;
