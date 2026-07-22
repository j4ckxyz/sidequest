-- Cached embeddings for user-selected skills and free-text interest keywords. The server
-- hashes the source text, so unchanged preferences are never sent to Gemini twice.

create table if not exists public.profile_embeddings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  embedding vector(768) not null,
  source_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.profile_embeddings enable row level security;
-- Intentionally no policies: only the recommendations service key reads/writes this table.
