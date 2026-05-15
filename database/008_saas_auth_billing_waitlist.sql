-- UnifData SaaS auth, billing, and waitlist foundation.
-- Run after the existing schema migrations.

create extension if not exists pgcrypto;

-- Clerk is now the source of truth for authentication. Profiles keep the
-- stable UUID used by existing company membership relationships.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  alter column id set default gen_random_uuid();

alter table public.profiles
  add column if not exists clerk_user_id text,
  add column if not exists email text;

create unique index if not exists profiles_clerk_user_id_key
on public.profiles(clerk_user_id)
where clerk_user_id is not null;

create unique index if not exists profiles_email_key
on public.profiles(lower(email))
where email is not null;

-- Lead intake for invite-only onboarding.
create table if not exists public.waitlist_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text not null,
  company_size text not null,
  use_case text not null,
  website text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_requests_email_key
on public.waitlist_requests(lower(email));

create index if not exists idx_waitlist_requests_status_created_at
on public.waitlist_requests(status, created_at desc);

-- Stripe webhook idempotency and audit trail.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create index if not exists idx_stripe_events_type_created_at
on public.stripe_events(type, created_at desc);

alter table public.waitlist_requests enable row level security;
alter table public.stripe_events enable row level security;

drop policy if exists "Service role can manage waitlist requests" on public.waitlist_requests;
create policy "Service role can manage waitlist requests"
on public.waitlist_requests
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage stripe events" on public.stripe_events;
create policy "Service role can manage stripe events"
on public.stripe_events
for all
to service_role
using (true)
with check (true);
