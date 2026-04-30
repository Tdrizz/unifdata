-- FrontierOps Import & Sync Engine
-- Version: 004
-- Purpose:
-- Create the foundation for read-only external data syncs.
--
-- This supports future sources like:
-- - Google Sheets
-- - QuickBooks
-- - Stripe / Square
-- - Jobber / Housecall Pro
-- - HubSpot / GoHighLevel
--
-- The first production goal is read-only sync into FrontierOps.
-- Two-way sync should be treated as a later, higher-risk feature.

-- ------------------------------------------------------------
-- INTEGRATIONS
-- ------------------------------------------------------------
-- Stores connected external providers for a company.
-- Tokens should be encrypted or stored securely before production OAuth use.

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null,
  provider_account_name text,
  status text not null default 'active',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SYNC CONNECTIONS
-- ------------------------------------------------------------
-- A sync connection defines what external data source maps to what FrontierOps record type.
--
-- Example:
-- Google Sheet "Customers" tab → relationships
-- QuickBooks invoices → revenue
-- Jobber jobs → work

create table if not exists public.sync_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid references public.integrations(id) on delete cascade,
  name text not null,
  source_type text not null default 'csv',
  source_name text,
  record_type text not null,
  mapping jsonb not null default '{}'::jsonb,
  sync_frequency text not null default 'manual',
  status text not null default 'active',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SYNC RUNS
-- ------------------------------------------------------------
-- Tracks every import/sync attempt.
-- This is what lets users see whether a sync worked, failed, or partially completed.

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sync_connection_id uuid references public.sync_connections(id) on delete set null,
  status text not null default 'pending',
  records_seen integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  records_failed integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

-- ------------------------------------------------------------
-- EXTERNAL RECORD LINKS
-- ------------------------------------------------------------
-- Prevents duplicate imports by remembering which external record maps to which FrontierOps record.
--
-- Example:
-- provider: google_sheets
-- external_id: sheet_id:tab_name:row_17
-- internal_table: customers
-- internal_id: <customer uuid>

create table if not exists public.external_record_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid references public.integrations(id) on delete cascade,
  sync_connection_id uuid references public.sync_connections(id) on delete cascade,
  provider text not null,
  external_id text not null,
  external_hash text,
  internal_table text not null,
  internal_id uuid not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, provider, external_id, internal_table)
);

-- ------------------------------------------------------------
-- UPDATED_AT TRIGGERS
-- ------------------------------------------------------------

drop trigger if exists set_integrations_updated_at on public.integrations;
create trigger set_integrations_updated_at
before update on public.integrations
for each row
execute function public.set_updated_at();

drop trigger if exists set_sync_connections_updated_at on public.sync_connections;
create trigger set_sync_connections_updated_at
before update on public.sync_connections
for each row
execute function public.set_updated_at();

drop trigger if exists set_external_record_links_updated_at on public.external_record_links;
create trigger set_external_record_links_updated_at
before update on public.external_record_links
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index if not exists idx_integrations_company_id
on public.integrations(company_id);

create index if not exists idx_integrations_provider
on public.integrations(provider);

create index if not exists idx_sync_connections_company_id
on public.sync_connections(company_id);

create index if not exists idx_sync_connections_integration_id
on public.sync_connections(integration_id);

create index if not exists idx_sync_connections_record_type
on public.sync_connections(record_type);

create index if not exists idx_sync_runs_company_id
on public.sync_runs(company_id);

create index if not exists idx_sync_runs_connection_id
on public.sync_runs(sync_connection_id);

create index if not exists idx_external_record_links_company_id
on public.external_record_links(company_id);

create index if not exists idx_external_record_links_integration_id
on public.external_record_links(integration_id);

create index if not exists idx_external_record_links_external_id
on public.external_record_links(external_id);

-- ------------------------------------------------------------
-- ENABLE RLS
-- ------------------------------------------------------------

alter table public.integrations enable row level security;
alter table public.sync_connections enable row level security;
alter table public.sync_runs enable row level security;
alter table public.external_record_links enable row level security;

-- ------------------------------------------------------------
-- DROP OLD POLICIES IF RE-RUNNING
-- ------------------------------------------------------------

drop policy if exists "Members can view integrations" on public.integrations;
drop policy if exists "Members can create integrations" on public.integrations;
drop policy if exists "Members can update integrations" on public.integrations;
drop policy if exists "Members can delete integrations" on public.integrations;

drop policy if exists "Members can view sync connections" on public.sync_connections;
drop policy if exists "Members can create sync connections" on public.sync_connections;
drop policy if exists "Members can update sync connections" on public.sync_connections;
drop policy if exists "Members can delete sync connections" on public.sync_connections;

drop policy if exists "Members can view sync runs" on public.sync_runs;
drop policy if exists "Members can create sync runs" on public.sync_runs;
drop policy if exists "Members can update sync runs" on public.sync_runs;
drop policy if exists "Members can delete sync runs" on public.sync_runs;

drop policy if exists "Members can view external record links" on public.external_record_links;
drop policy if exists "Members can create external record links" on public.external_record_links;
drop policy if exists "Members can update external record links" on public.external_record_links;
drop policy if exists "Members can delete external record links" on public.external_record_links;

-- ------------------------------------------------------------
-- POLICIES
-- ------------------------------------------------------------

create policy "Members can view integrations"
on public.integrations
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create integrations"
on public.integrations
for insert
to authenticated
with check (public.is_company_member(company_id));

create policy "Members can update integrations"
on public.integrations
for update
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Members can delete integrations"
on public.integrations
for delete
to authenticated
using (public.is_company_member(company_id));

create policy "Members can view sync connections"
on public.sync_connections
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create sync connections"
on public.sync_connections
for insert
to authenticated
with check (public.is_company_member(company_id));

create policy "Members can update sync connections"
on public.sync_connections
for update
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Members can delete sync connections"
on public.sync_connections
for delete
to authenticated
using (public.is_company_member(company_id));

create policy "Members can view sync runs"
on public.sync_runs
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create sync runs"
on public.sync_runs
for insert
to authenticated
with check (public.is_company_member(company_id));

create policy "Members can update sync runs"
on public.sync_runs
for update
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Members can delete sync runs"
on public.sync_runs
for delete
to authenticated
using (public.is_company_member(company_id));

create policy "Members can view external record links"
on public.external_record_links
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create external record links"
on public.external_record_links
for insert
to authenticated
with check (public.is_company_member(company_id));

create policy "Members can update external record links"
on public.external_record_links
for update
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Members can delete external record links"
on public.external_record_links
for delete
to authenticated
using (public.is_company_member(company_id));