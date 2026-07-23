-- Multi-person jobs: a poster hires several helpers, so they must be able to
-- leave one review PER helper — not one review for the whole job.
--
-- 0001_init.sql created `reviews` with `unique (job_id, reviewer_id)`, which
-- caps a reviewer at a single review per job. Widen it to include the reviewee
-- so each (job, reviewer, reviewee) pair gets its own review, while still
-- preventing a reviewer from reviewing the same person twice for one job.

alter table public.reviews drop constraint if exists reviews_job_id_reviewer_id_key;

create unique index if not exists reviews_job_reviewer_reviewee_key
  on public.reviews (job_id, reviewer_id, reviewee_id);
