-- UnifData Multi-Tenant Isolation Hardening
-- Version: 013
-- Purpose:
--   1. Add set_org_scope() so stored procedures and batch SQL can declare
--      organisation context explicitly via a transaction-local session variable.
--   2. Replace the permissive RLS policies on master_customers,
--      master_customer_audit_logs, and communications_log with dual-mode
--      policies that honour EITHER the JWT membership check (is_company_member)
--      for interactive authenticated sessions OR the session variable
--      (app.current_organization_id) for service-level stored procedures.
--
-- Isolation guarantee matrix
-- ──────────────────────────────────────────────────────────────────────────────
-- Role             │ Enforcement mechanism
-- ─────────────────┼──────────────────────────────────────────────────────────
-- authenticated    │ RLS: is_company_member(organization_id)   ← JWT check
-- authenticated    │ RLS: current_setting('app.current…')      ← session var
-- service_role     │ BYPASSRLS — no policy is evaluated.
--                  │ Isolation guaranteed by explicit organization_id WHERE
--                  │ filters on every query in the application layer.
--                  │ set_org_scope() is called as a code-level discipline
--                  │ guardrail and for future SECURITY DEFINER function use.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Helper: set_org_scope ─────────────────────────────────────────────────────
-- Sets app.current_organization_id as a transaction-local variable.
-- Call this at the start of any Postgres function or stored procedure that
-- issues queries against the new tables under a non-JWT execution context.

CREATE OR REPLACE FUNCTION public.set_org_scope(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_organization_id', p_org_id::text, true);
END;
$$;

COMMENT ON FUNCTION public.set_org_scope(uuid) IS
  'Sets app.current_organization_id as a transaction-local session variable. '
  'Used by service-level stored procedures and batch operations to declare '
  'organisation scope so current_setting()-based RLS policies can enforce '
  'tenant isolation without requiring a JWT auth context.';

-- ── master_customers ──────────────────────────────────────────────────────────
-- Replace the single membership-only policy with a dual-mode policy.

DROP POLICY IF EXISTS mc_company_isolation ON public.master_customers;
DROP POLICY IF EXISTS mc_tenant_isolation ON public.master_customers;

CREATE POLICY mc_tenant_isolation ON public.master_customers
  USING (
    is_company_member(organization_id)
    OR organization_id = nullif(current_setting('app.current_organization_id', true), '')::uuid
  )
  WITH CHECK (
    is_company_member(organization_id)
    OR organization_id = nullif(current_setting('app.current_organization_id', true), '')::uuid
  );

-- ── master_customer_audit_logs ────────────────────────────────────────────────
-- Read-only for org members; inserts are performed exclusively by the
-- SECURITY DEFINER trigger which runs as superuser and bypasses RLS.

DROP POLICY IF EXISTS mc_audit_company_isolation ON public.master_customer_audit_logs;
DROP POLICY IF EXISTS mc_audit_tenant_isolation ON public.master_customer_audit_logs;

CREATE POLICY mc_audit_tenant_isolation ON public.master_customer_audit_logs
  FOR SELECT
  USING (
    is_company_member(organization_id)
    OR organization_id = nullif(current_setting('app.current_organization_id', true), '')::uuid
  );

-- ── communications_log ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS comms_company_isolation ON public.communications_log;
DROP POLICY IF EXISTS comms_tenant_isolation ON public.communications_log;

CREATE POLICY comms_tenant_isolation ON public.communications_log
  USING (
    is_company_member(organization_id)
    OR organization_id = nullif(current_setting('app.current_organization_id', true), '')::uuid
  )
  WITH CHECK (
    is_company_member(organization_id)
    OR organization_id = nullif(current_setting('app.current_organization_id', true), '')::uuid
  );
