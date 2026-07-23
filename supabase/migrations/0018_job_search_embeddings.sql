-- Semantic job search, isolated from the recommendations pipeline.
--
-- Recs embed jobs + user taste with gemini-embedding-001 (job_embeddings /
-- user_taste, 0002). Search uses gemini-embedding-2, whose vector space is
-- INCOMPATIBLE with 001, so it gets its own table and match function. Populated
-- server-side (service key); the client only calls the /search HTTP endpoint.

create extension if not exists vector;

create table if not exists public.job_search_embeddings (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  embedding vector(768) not null,
  source_hash text not null,
  updated_at timestamptz not null default now()
);

create index if not exists job_search_embeddings_ann_idx on public.job_search_embeddings
  using hnsw (embedding vector_cosine_ops);

alter table public.job_search_embeddings enable row level security;
-- No policies: only the service key (which bypasses RLS) writes/reads this.

-- Cosine-nearest open jobs to a query vector, with optional parish/category
-- narrowing. Vector passed as text ('[0.1,...]') so PostgREST forwards it cleanly.
create or replace function public.match_jobs_search(
  p_embedding text,
  p_k int default 30,
  p_parish text default null,
  p_category text default null
)
returns table (job_id uuid, distance real)
language sql
stable
security definer
set search_path = public
as $$
  select e.job_id, (e.embedding <=> p_embedding::vector(768))::real as distance
  from public.job_search_embeddings e
  join public.jobs j on j.id = e.job_id
  where j.status = 'open'
    and (p_parish is null or j.parish = p_parish)
    and (p_category is null or j.category = p_category)
  order by e.embedding <=> p_embedding::vector(768)
  limit p_k;
$$;
