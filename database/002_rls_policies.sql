-- FrontierOps RLS Policies
-- Version: 002
-- Purpose: Secure company data so users can only access records
-- connected to companies they belong to.

-- ------------------------------------------------------------
-- PROFILE CREATION TRIGGER
-- ------------------------------------------------------------
-- Supabase Auth stores users in auth.users.
-- This trigger creates a matching public.profiles row when a user signs up.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ------------------------------------------------------------
-- HELPER FUNCTION: IS COMPANY MEMBER
-- ------------------------------------------------------------
-- Checks whether the logged-in user belongs to a company.
-- This is used inside RLS policies.

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members
    where company_members.company_id = p_company_id
      and company_members.user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- HELPER FUNCTION: IS COMPANY ADMIN
-- ------------------------------------------------------------
-- Checks whether the logged-in user is an owner/admin of a company.
-- We will use this later for inviting users and admin-level actions.

create or replace function public.is_company_admin(p_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members
    where company_members.company_id = p_company_id
      and company_members.user_id = auth.uid()
      and company_members.role in ('owner', 'admin')
  );
$$;

-- ------------------------------------------------------------
-- CREATE COMPANY FUNCTION
-- ------------------------------------------------------------
-- Allows an authenticated user to create a company and automatically
-- become the owner of that company.

create or replace function public.create_company(
  p_name text,
  p_industry text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.companies (name, industry)
  values (p_name, p_industry)
  returning id into new_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (new_company_id, auth.uid(), 'owner');

  return new_company_id;
end;
$$;

grant execute on function public.create_company(text, text) to authenticated;

-- ------------------------------------------------------------
-- DROP OLD POLICIES IF RE-RUNNING THIS FILE
-- ------------------------------------------------------------
-- This makes the file safer to run more than once while developing.

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

drop policy if exists "Members can view their companies" on public.companies;

drop policy if exists "Members can view company memberships" on public.company_members;
drop policy if exists "Admins can add company members" on public.company_members;
drop policy if exists "Admins can update company members" on public.company_members;
drop policy if exists "Admins can delete company members" on public.company_members;

drop policy if exists "Members can view customers" on public.customers;
drop policy if exists "Members can create customers" on public.customers;
drop policy if exists "Members can update customers" on public.customers;
drop policy if exists "Members can delete customers" on public.customers;

drop policy if exists "Members can view leads" on public.leads;
drop policy if exists "Members can create leads" on public.leads;
drop policy if exists "Members can update leads" on public.leads;
drop policy if exists "Members can delete leads" on public.leads;

drop policy if exists "Members can view jobs" on public.jobs;
drop policy if exists "Members can create jobs" on public.jobs;
drop policy if exists "Members can update jobs" on public.jobs;
drop policy if exists "Members can delete jobs" on public.jobs;

drop policy if exists "Members can view sales" on public.sales;
drop policy if exists "Members can create sales" on public.sales;
drop policy if exists "Members can update sales" on public.sales;
drop policy if exists "Members can delete sales" on public.sales;

drop policy if exists "Members can view follow ups" on public.follow_ups;
drop policy if exists "Members can create follow ups" on public.follow_ups;
drop policy if exists "Members can update follow ups" on public.follow_ups;
drop policy if exists "Members can delete follow ups" on public.follow_ups;

drop policy if exists "Members can view imports" on public.imports;
drop policy if exists "Members can create imports" on public.imports;

drop policy if exists "Members can view ai reports" on public.ai_reports;
drop policy if exists "Members can create ai reports" on public.ai_reports;

drop policy if exists "Members can view activity logs" on public.activity_logs;
drop policy if exists "Members can create activity logs" on public.activity_logs;

-- ------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- ------------------------------------------------------------
-- COMPANIES POLICIES
-- ------------------------------------------------------------

create policy "Members can view their companies"
on public.companies
for select
to authenticated
using (public.is_company_member(id));

-- Note:
-- We do not allow direct company inserts from the client.
-- Companies are created through public.create_company().

-- ------------------------------------------------------------
-- COMPANY MEMBERS POLICIES
-- ------------------------------------------------------------

create policy "Members can view company memberships"
on public.company_members
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Admins can add company members"
on public.company_members
for insert
to authenticated
with check (public.is_company_admin(company_id));

create policy "Admins can update company members"
on public.company_members
for update
to authenticated
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));

create policy "Admins can delete company members"
on public.company_members
for delete
to authenticated
using (public.is_company_admin(company_id));

-- ------------------------------------------------------------
-- CUSTOMERS POLICIES
-- ------------------------------------------------------------

create policy "Members can view customers"
on public.customers
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create customers"
on public.customers
for insert
to authenticated
with check (public.is_company_member(company_id));

create policy "Members can update customers"
on public.customers
for update
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Members can delete customers"
on public.customers
for delete
to authenticated
using (public.is_company_member(company_id));

-- ------------------------------------------------------------
-- LEADS POLICIES
-- ------------------------------------------------------------

create policy "Members can view leads"
on public.leads
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create leads"
on public.leads
for insert
to authenticated
with check (public.is_company_member(company_id));

create policy "Members can update leads"
on public.leads
for update
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Members can delete leads"
on public.leads
for delete
to authenticated
using (public.is_company_member(company_id));

-- ------------------------------------------------------------
-- JOBS POLICIES
-- ------------------------------------------------------------

create policy "Members can view jobs"
on public.jobs
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create jobs"
on public.jobs
for insert
to authenticated
with check (public.is_company_member(company_id));

create policy "Members can update jobs"
on public.jobs
for update
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Members can delete jobs"
on public.jobs
for delete
to authenticated
using (public.is_company_member(company_id));

-- ------------------------------------------------------------
-- SALES POLICIES
-- ------------------------------------------------------------

create policy "Members can view sales"
on public.sales
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create sales"
on public.sales
for insert
to authenticated
with check (public.is_company_member(company_id));

create policy "Members can update sales"
on public.sales
for update
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Members can delete sales"
on public.sales
for delete
to authenticated
using (public.is_company_member(company_id));

-- ------------------------------------------------------------
-- FOLLOW UPS POLICIES
-- ------------------------------------------------------------

create policy "Members can view follow ups"
on public.follow_ups
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create follow ups"
on public.follow_ups
for insert
to authenticated
with check (public.is_company_member(company_id));

create policy "Members can update follow ups"
on public.follow_ups
for update
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Members can delete follow ups"
on public.follow_ups
for delete
to authenticated
using (public.is_company_member(company_id));

-- ------------------------------------------------------------
-- IMPORTS POLICIES
-- ------------------------------------------------------------

create policy "Members can view imports"
on public.imports
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create imports"
on public.imports
for insert
to authenticated
with check (public.is_company_member(company_id));

-- ------------------------------------------------------------
-- AI REPORTS POLICIES
-- ------------------------------------------------------------

create policy "Members can view ai reports"
on public.ai_reports
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create ai reports"
on public.ai_reports
for insert
to authenticated
with check (public.is_company_member(company_id));

-- ------------------------------------------------------------
-- ACTIVITY LOGS POLICIES
-- ------------------------------------------------------------

create policy "Members can view activity logs"
on public.activity_logs
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Members can create activity logs"
on public.activity_logs
for insert
to authenticated
with check (
  company_id is null
  or public.is_company_member(company_id)
);