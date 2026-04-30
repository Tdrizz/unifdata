-- FrontierOps Import Sessions
-- Version: 005
-- Purpose:
-- Add staged import sessions so CSV, Google Sheets, QuickBooks, and future syncs
-- all move through the same safe workflow:
--
-- Source data → Import session → Normalize → Match/dedupe → Preview → Commit → Sync history
--
-- This is read-only/import-first infrastructure. Two-way sync should remain a later feature.

-- ------------------------------------------------------------
-- IMPORT SESSIONS
-- ------------------------------------------------------------
-- One import session represents one staged import/sync preview.
--
-- Examples:
-- - Uploaded CSV of customers
-- - Google Sheets tab pulled into staging
-- - QuickBooks invoices pulled into staging
--
-- A session should be created before records are committed into customers/leads/jobs/sales/follow_ups.

create table if not exists public.import_sessions (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null references public.companies(id) on delete cascade,
  sync_connection_id uuid references public.sync_connections(id) on delete set null,

  source_type text not null default 'csv',
  source_name text,
  file_name text,

  record_type text not null,

  status text not null default 'draft',
  -- draft | analyzing | ready | committed | failed | cancelled

  mapping jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,

  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  error_rows integer not null default 0,

  created_rows integer not null default 0,
  updated_rows integer not null default 0,
  skipped_rows integer not null default 0,

  error_message text,

  created_by uuid references auth.users(id) on delete set null default auth.uid(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  committed_at timestamptz
);

-- ------------------------------------------------------------
-- IMPORT SESSION ROWS
-- ------------------------------------------------------------
-- Stores every staged row before it is committed.
--
-- This lets FrontierOps:
-- - preview rows before import
-- - detect duplicates
-- - validate required fields
-- - show failed rows
-- - prevent blind imports
-- - later reuse the same pipeline for Google Sheets / QuickBooks

create table if not exists public.import_session_rows (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null references public.companies(id) on delete cascade,
  import_session_id uuid not null references public.import_sessions(id) on delete cascade,

  row_number integer not null,

  external_id text,
  external_hash text,

  raw_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,

  target_table text,
  target_id uuid,

  action text not null default 'review',
  -- create | update | skip | review | error

  status text not null default 'pending',
  -- pending | valid | duplicate | error | committed | skipped

  match_confidence numeric,
  duplicate_reason text,
  validation_errors jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- UPDATED_AT TRIGGERS
-- ------------------------------------------------------------

drop trigger if exists set_import_sessions_updated_at on public.import_sessions;
create trigger set_import_sessions_updated_at
before update on public.import_sessions
for each row
execute function public.set_updated_at();

drop trigger if exists set_import_session_rows_updated_at on public.import_session_rows;
create trigger set_import_session_rows_updated_at
before update on public.import_session_rows
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index if not exists idx_import_sessions_company_id
on public.import_sessions(company_id);

create index if not exists idx_import_sessions_sync_connection_id
on public.import_sessions(sync_connection_id);

create index if not exists idx_import_sessions_source_type
on public.import_sessions(source_type);

create index if not exists idx_import_sessions_record_type
on public.import_sessions(record_type);

create index if not exists idx_import_sessions_status
on public.import_sessions(status);

create index if not exists idx_import_session_rows_company_id
on public.import_session_rows(company_id);

create index if not exists idx_import_session_rows_session_id
on public.import_session_rows(import_session_id);

create unique index if not exists idx_import_session_rows_unique_row
on public.import_session_rows(import_session_id, row_number);

create index if not exists idx_import_session_rows_external_id
on public.import_session_rows(external_id);

create index if not exists idx_import_session_rows_external_hash
on public.import_session_rows(external_hash);

create index if not exists idx_import_session_rows_action
on public.import_session_rows(action);

create index if not exists idx_import_session_rows_status
on public.import_session_rows(status);

create index if not exists idx_import_session_rows_target
on public.import_session_rows(target_table, target_id);

-- ------------------------------------------------------------
-- ENABLE RLS
-- ------------------------------------------------------------

alter table public.import_sessions enable row level security;
alter table public.import_session_rows enable row level security;

-- ------------------------------------------------------------
-- DROP OLD POLICIES IF RE-RUNNING
-- ------------------------------------------------------------

drop policy if exists "Members can view import sessions" on public.import_sessions;
drop policy if exists "Members can create import sessions" on public.import_sessions;
drop policy if exists "Members can update import sessions" on public.import_sessions;
drop policy if exists "Members can delete import sessions" on public.import_sessions;

drop policy if exists "Members can view import session rows" on public.import_session_rows;
drop policy if exists "Members can create import session rows" on public.import_session_rows;
drop policy if exists "Members can update import session rows" on public.import_session_rows;
drop policy if exists "Members can delete import session rows" on public.import_session_rows;

-- ------------------------------------------------------------
-- POLICIES
-- ------------------------------------------------------------

create policy "Members can view import sessions"
on public.import_sessions
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create import sessions"
on public.import_sessions
for insert
to authenticated
with check (public.is_company_member(company_id));

create policy "Members can update import sessions"
on public.import_sessions
for update
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Members can delete import sessions"
on public.import_sessions
for delete
to authenticated
using (public.is_company_member(company_id));

create policy "Members can view import session rows"
on public.import_session_rows
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create import session rows"
on public.import_session_rows
for insert
to authenticated
with check (public.is_company_member(company_id));

create policy "Members can update import session rows"
on public.import_session_rows
for update
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Members can delete import session rows"
on public.import_session_rows
for delete
to authenticated
using (public.is_company_member(company_id));