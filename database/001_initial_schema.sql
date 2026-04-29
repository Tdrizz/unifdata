-- FrontierOps Initial Database Schema
-- Version: 001
-- Purpose: Create the core database tables for companies, customers, leads,
-- jobs, sales, follow-ups, imports, AI reports, and activity logs.

-- Enable UUID generation.
-- UUIDs are safer than simple 1, 2, 3 IDs because they are harder to guess.
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
-- Supabase Auth stores users in auth.users.
-- This profiles table stores app-level user info connected to auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- COMPANIES
-- ------------------------------------------------------------
-- Each business using FrontierOps gets one company record.
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  plan text not null default 'pilot',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- COMPANY MEMBERS
-- ------------------------------------------------------------
-- Connects users to companies.
-- Example: Bob belongs to Arctic Ridge Services as owner/admin/staff.
create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);

-- ------------------------------------------------------------
-- CUSTOMERS
-- ------------------------------------------------------------
-- Stores customer contact info and notes.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  customer_type text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- LEADS
-- ------------------------------------------------------------
-- Tracks potential work/opportunities.
-- Example: someone asks for a driveway repair estimate.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  source text,
  service_requested text,
  status text not null default 'New',
  estimated_value numeric(12,2),
  next_follow_up_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- JOBS
-- ------------------------------------------------------------
-- Tracks actual work that has been scheduled, started, completed, or paid.
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  service_type text,
  status text not null default 'Scheduled',
  job_value numeric(12,2),
  start_date date,
  completed_date date,
  paid_status text not null default 'Unpaid',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SALES
-- ------------------------------------------------------------
-- Tracks revenue records.
-- A sale may connect to a customer and/or job.
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  amount numeric(12,2) not null default 0,
  payment_status text not null default 'Paid',
  sale_date date not null default current_date,
  service_type text,
  source text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- FOLLOW UPS
-- ------------------------------------------------------------
-- Tracks reminders to contact customers/leads.
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  due_date date not null,
  status text not null default 'Open',
  message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ------------------------------------------------------------
-- IMPORTS
-- ------------------------------------------------------------
-- Tracks CSV/spreadsheet imports.
create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  file_name text not null,
  import_type text not null,
  status text not null default 'pending',
  records_created integer not null default 0,
  errors jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- AI REPORTS
-- ------------------------------------------------------------
-- Stores AI-generated summaries and reports.
create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  report_type text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ACTIVITY LOGS
-- ------------------------------------------------------------
-- Tracks important user actions.
-- Useful later for security, debugging, and audit history.
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  record_type text,
  record_id uuid,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- UPDATED_AT HELPER
-- ------------------------------------------------------------
-- This function automatically updates updated_at when records change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Customers updated_at trigger
drop trigger if exists set_customers_updated_at on public.customers;

create trigger set_customers_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

-- Leads updated_at trigger
drop trigger if exists set_leads_updated_at on public.leads;

create trigger set_leads_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

-- Jobs updated_at trigger
drop trigger if exists set_jobs_updated_at on public.jobs;

create trigger set_jobs_updated_at
before update on public.jobs
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------
-- Indexes make common queries faster.
-- Most FrontierOps queries will filter by company_id.

create index if not exists idx_company_members_company_id
on public.company_members(company_id);

create index if not exists idx_company_members_user_id
on public.company_members(user_id);

create index if not exists idx_customers_company_id
on public.customers(company_id);

create index if not exists idx_leads_company_id
on public.leads(company_id);

create index if not exists idx_leads_customer_id
on public.leads(customer_id);

create index if not exists idx_leads_next_follow_up_date
on public.leads(next_follow_up_date);

create index if not exists idx_jobs_company_id
on public.jobs(company_id);

create index if not exists idx_jobs_customer_id
on public.jobs(customer_id);

create index if not exists idx_jobs_lead_id
on public.jobs(lead_id);

create index if not exists idx_sales_company_id
on public.sales(company_id);

create index if not exists idx_sales_sale_date
on public.sales(sale_date);

create index if not exists idx_follow_ups_company_id
on public.follow_ups(company_id);

create index if not exists idx_follow_ups_due_date
on public.follow_ups(due_date);

create index if not exists idx_imports_company_id
on public.imports(company_id);

create index if not exists idx_ai_reports_company_id
on public.ai_reports(company_id);

create index if not exists idx_activity_logs_company_id
on public.activity_logs(company_id);

-- ------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- ------------------------------------------------------------
-- We enable RLS now so the tables are protected by default.
-- In Chunk 5, we will add the policies that allow the correct users
-- to access the correct company data.

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.jobs enable row level security;
alter table public.sales enable row level security;
alter table public.follow_ups enable row level security;
alter table public.imports enable row level security;
alter table public.ai_reports enable row level security;
alter table public.activity_logs enable row level security;