-- Rate limit persistence
-- Replaces in-memory Map with a Supabase-backed table so limits survive server restarts.
-- No RLS needed — only accessed via the service role client.

create table if not exists public.rate_limit_requests (
  id bigserial primary key,
  key text not null,
  requested_at timestamptz not null default now()
);

create index if not exists rate_limit_requests_key_requested_at_idx
  on public.rate_limit_requests (key, requested_at);
