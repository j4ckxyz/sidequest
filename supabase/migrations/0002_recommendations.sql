-- SideQuest recommendations — embeddings-backed "Picked for you".
-- Populated entirely by the server/ service using the Supabase service key; the client
-- only ever *reads* its own recommendations. Embeddings live in their own tables so the
-- jobs/profiles rows (and every existing `select('*')`) stay small.

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- job_embeddings — one row per embedded open job. Server-only (no RLS policies).
-- source_hash lets the hourly job skip re-embedding jobs whose text hasn't changed.
-- ---------------------------------------------------------------------------
create table public.job_embeddings (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  embedding vector(768) not null,
  source_hash text not null,
  updated_at timestamptz not null default now()
);

create index job_embeddings_ann_idx on public.job_embeddings
  using hnsw (embedding vector_cosine_ops);

alter table public.job_embeddings enable row level security;
-- Intentionally no policies: only the service key (which bypasses RLS) touches this.

-- ---------------------------------------------------------------------------
-- user_taste — each active user's taste vector (weighted mean of their history). Server-only.
-- ---------------------------------------------------------------------------
create table public.user_taste (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  embedding vector(768) not null,
  updated_at timestamptz not null default now()
);

alter table public.user_taste enable row level security;
-- No policies: server-only.

-- ---------------------------------------------------------------------------
-- recommendations — precomputed per-user ranked open jobs. Client reads its own.
-- ---------------------------------------------------------------------------
create table public.recommendations (
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  score real not null,
  rank integer not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create index recommendations_user_rank_idx on public.recommendations (user_id, rank);

alter table public.recommendations enable row level security;

create policy "users read own recommendations" on public.recommendations
  for select using (user_id = auth.uid());
-- No insert/update/delete policies: the server writes these with the service key.

-- ---------------------------------------------------------------------------
-- match_open_jobs — cosine-nearest open jobs to a taste/query vector, excluding the
-- user's own posts and anything they've already applied to. Takes the vector as text
-- (e.g. '[0.1,0.2,...]') so PostgREST passes it cleanly, then casts to vector.
-- ---------------------------------------------------------------------------
create function public.match_open_jobs(p_embedding text, p_exclude_user uuid, p_k int default 8)
returns table (job_id uuid, distance real)
language sql
stable
security definer
set search_path = public
as $$
  select e.job_id, (e.embedding <=> p_embedding::vector(768))::real as distance
  from public.job_embeddings e
  join public.jobs j on j.id = e.job_id
  where j.status = 'open'
    and j.poster_id <> p_exclude_user
    and not exists (
      select 1 from public.applications a
      where a.job_id = e.job_id and a.quester_id = p_exclude_user
    )
  order by e.embedding <=> p_embedding::vector(768)
  limit p_k;
$$;
