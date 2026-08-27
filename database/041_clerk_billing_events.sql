-- Idempotency + audit log for Clerk Billing webhooks (subscription.*), mirroring
-- the existing stripe_events table. Kept separate rather than reused because the
-- id format differs (Svix "msg_..." vs Stripe "evt_...") and the two providers'
-- event streams are conceptually distinct.
create table if not exists public.clerk_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create index if not exists idx_clerk_events_type_created_at
on public.clerk_events(type, created_at desc);

alter table public.clerk_events enable row level security;

drop policy if exists "Service role can manage clerk events" on public.clerk_events;
create policy "Service role can manage clerk events"
on public.clerk_events
for all
to service_role
using (true)
with check (true);
