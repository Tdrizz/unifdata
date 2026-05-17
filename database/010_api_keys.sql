-- Per-company API keys for the lead ingest endpoint.
-- Replaces the single global LEAD_INGEST_SECRET with scoped keys per workspace.
-- Keys are stored as SHA-256 hashes; the raw key is shown once at creation.

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  key_hash text not null unique,
  name text not null default 'API Key',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_company_id_idx on public.api_keys (company_id);
create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);

alter table public.api_keys enable row level security;

create policy "Members can view api keys"
  on public.api_keys for select
  to authenticated
  using (public.is_company_member(company_id));

create policy "Admins can create api keys"
  on public.api_keys for insert
  to authenticated
  with check (public.is_company_admin(company_id));

create policy "Admins can update api keys"
  on public.api_keys for update
  to authenticated
  using (public.is_company_admin(company_id));

create policy "Admins can delete api keys"
  on public.api_keys for delete
  to authenticated
  using (public.is_company_admin(company_id));
