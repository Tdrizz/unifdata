-- FrontierOps Performance Optimizations
-- Version: 007
-- Purpose:
-- 1. Fix is_company_member / is_company_admin to use (select auth.uid())
--    and mark stable so PostgreSQL evaluates auth.uid() once per query,
--    not once per row during RLS checks.
-- 2. Add compound (company_id, created_at desc) indexes for every core table.
--    Every list page queries WHERE company_id = X ORDER BY created_at DESC LIMIT 250.
--    Without these, PostgreSQL filters by company_id then sorts separately.
--    With them, it satisfies both the filter and the sort from one index scan.
-- 3. Add (company_id, email) and (company_id, phone) partial indexes on customers
--    for the lead ingest deduplication queries.
-- 4. Add (company_id, status) compound indexes for workspace and CRM filtering.

-- ------------------------------------------------------------
-- FIX RLS HELPER FUNCTIONS
-- ------------------------------------------------------------
-- Using (select auth.uid()) instead of auth.uid() directly tells PostgreSQL
-- to evaluate the expression once per query rather than once per row.
-- Marking the function stable allows further query planning optimizations.

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members
    where company_members.company_id = p_company_id
      and company_members.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_company_admin(p_company_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members
    where company_members.company_id = p_company_id
      and company_members.user_id = (select auth.uid())
      and company_members.role in ('owner', 'admin')
  );
$$;

-- ------------------------------------------------------------
-- COMPOUND (company_id, created_at DESC) INDEXES
-- ------------------------------------------------------------
-- Covers the WHERE company_id = X ORDER BY created_at DESC LIMIT N
-- pattern used on every list page. PostgreSQL can satisfy both the
-- filter and the sort from a single index scan and stop at the limit.

create index if not exists idx_customers_company_created
  on public.customers(company_id, created_at desc);

create index if not exists idx_leads_company_created
  on public.leads(company_id, created_at desc);

create index if not exists idx_jobs_company_created
  on public.jobs(company_id, created_at desc);

create index if not exists idx_sales_company_created
  on public.sales(company_id, created_at desc);

create index if not exists idx_follow_ups_company_created
  on public.follow_ups(company_id, created_at desc);

create index if not exists idx_import_sessions_company_created
  on public.import_sessions(company_id, created_at desc);

-- ------------------------------------------------------------
-- CUSTOMER DEDUPLICATION INDEXES
-- ------------------------------------------------------------
-- Used by the lead ingest endpoint to find existing customers
-- by email or phone before creating a new record.

create index if not exists idx_customers_company_email
  on public.customers(company_id, email)
  where email is not null;

create index if not exists idx_customers_company_phone
  on public.customers(company_id, phone)
  where phone is not null;

-- ------------------------------------------------------------
-- STATUS FILTERING INDEXES
-- ------------------------------------------------------------
-- The workspace and CRM pages filter leads, jobs, follow_ups,
-- and sales by status/payment_status after fetching by company.

create index if not exists idx_leads_company_status
  on public.leads(company_id, status);

create index if not exists idx_jobs_company_status
  on public.jobs(company_id, status);

create index if not exists idx_jobs_company_paid_status
  on public.jobs(company_id, paid_status);

create index if not exists idx_follow_ups_company_status
  on public.follow_ups(company_id, status);

create index if not exists idx_sales_company_payment_status
  on public.sales(company_id, payment_status);
