-- Finish the multi-person lifecycle: atomic hiring, every accepted helper can see/start/
-- complete the job, and completion credit/review permissions include every accepted helper.

create or replace function public.accept_application(p_application_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_job_id uuid;
  v_quester_id uuid;
  v_app_status application_status;
  v_poster_id uuid;
  v_job_status job_status;
  v_slots int;
  v_accepted int;
begin
  select job_id, quester_id into v_job_id, v_quester_id
  from public.applications where id = p_application_id;

  if v_job_id is null then
    raise exception 'Application not found.';
  end if;

  -- Serialize hires for this job so two clicks cannot overfill the final slot.
  select poster_id, status, slots into v_poster_id, v_job_status, v_slots
  from public.jobs where id = v_job_id for update;

  if v_poster_id is distinct from auth.uid() then
    raise exception 'Only the poster can hire for this job.';
  end if;
  if v_job_status <> 'open' then
    raise exception 'This job is no longer accepting people.';
  end if;

  select status into v_app_status from public.applications where id = p_application_id;
  if v_app_status <> 'pending' then
    raise exception 'This application has already been decided.';
  end if;

  select count(*) into v_accepted
  from public.applications where job_id = v_job_id and status = 'accepted';
  if v_accepted >= v_slots then
    raise exception 'Every spot has already been filled.';
  end if;

  update public.applications set status = 'accepted' where id = p_application_id;
  update public.jobs
    set assigned_quester_id = coalesce(assigned_quester_id, v_quester_id)
    where id = v_job_id;

  v_accepted := v_accepted + 1;
  if v_accepted >= v_slots then
    update public.applications set status = 'rejected'
      where job_id = v_job_id and status = 'pending';
    update public.jobs set status = 'assigned' where id = v_job_id;
  end if;
end;
$$;

create or replace function public.start_job(p_job_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.jobs j
    where j.id = p_job_id
      and j.status = 'assigned'
      and (
        j.poster_id = auth.uid()
        or j.assigned_quester_id = auth.uid()
        or exists (
          select 1 from public.applications a
          where a.job_id = j.id and a.quester_id = auth.uid() and a.status = 'accepted'
        )
      )
  ) then
    raise exception 'Only the poster or an accepted helper can start this job.';
  end if;
  update public.jobs set status = 'in_progress' where id = p_job_id;
end;
$$;

create or replace function public.complete_job(p_job_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.jobs j
    where j.id = p_job_id
      and j.status in ('assigned', 'in_progress')
      and (
        j.poster_id = auth.uid()
        or j.assigned_quester_id = auth.uid()
        or exists (
          select 1 from public.applications a
          where a.job_id = j.id and a.quester_id = auth.uid() and a.status = 'accepted'
        )
      )
  ) then
    raise exception 'Only the poster or an accepted helper can complete this job.';
  end if;
  update public.jobs set status = 'completed' where id = p_job_id;
end;
$$;

create or replace function public.bump_jobs_completed_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.profiles set jobs_completed_count = jobs_completed_count + 1
      where id = new.poster_id;
    update public.profiles set jobs_completed_count = jobs_completed_count + 1
      where id in (
        select a.quester_id from public.applications a
        where a.job_id = new.id and a.status = 'accepted'
        union
        select new.assigned_quester_id where new.assigned_quester_id is not null
      );
  end if;
  return new;
end;
$$;

drop policy if exists "participants review completed jobs once" on public.reviews;
create policy "participants review completed jobs once" on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and reviewer_id <> reviewee_id
    and exists (
      select 1 from public.jobs j
      where j.id = job_id
        and j.status = 'completed'
        and (
          (j.poster_id = auth.uid() and (
            reviewee_id = j.assigned_quester_id
            or exists (
              select 1 from public.applications a
              where a.job_id = j.id and a.quester_id = reviewee_id and a.status = 'accepted'
            )
          ))
          or (
            reviewee_id = j.poster_id
            and (
              j.assigned_quester_id = auth.uid()
              or exists (
                select 1 from public.applications a
                where a.job_id = j.id and a.quester_id = auth.uid() and a.status = 'accepted'
              )
            )
          )
        )
    )
  );
