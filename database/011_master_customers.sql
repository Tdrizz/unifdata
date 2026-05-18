-- UnifData Master Customer Schema
-- Version: 011
-- Purpose:
-- 1. Enable pg_trgm extension for fuzzy trigram searching across name/email fields.
-- 2. Create master_customers as the unified cross-provider customer entity.
--    Each row represents one real-world customer, with foreign key slots for
--    QuickBooks, Jobber, and HubSpot IDs, plus a sync_tokens JSONB column
--    used by the conflict resolver to prevent webhook echo loops.
-- 3. Create master_customer_audit_logs as an append-only change ledger.
--    A PL/pgSQL trigger writes one row per INSERT/UPDATE/DELETE automatically.
-- 4. Add GIN trigram indexes on name and email for fast fuzzy inbox searches.
-- 5. Apply Row-Level Security so each company can only access its own records.

-- ------------------------------------------------------------
-- EXTENSIONS
-- ------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ------------------------------------------------------------
-- MASTER CUSTOMERS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.master_customers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    first_name              VARCHAR(255),
    last_name               VARCHAR(255),
    primary_email           VARCHAR(255),
    primary_phone           VARCHAR(50),
    billing_address         JSONB,
    service_address         JSONB,
    quickbooks_customer_id  VARCHAR(255),
    jobber_client_id        VARCHAR(255),
    hubspot_contact_id      VARCHAR(255),
    data_health_score       INT DEFAULT 100,
    metadata                JSONB DEFAULT '{}'::jsonb,
    sync_tokens             JSONB DEFAULT '{}'::jsonb,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prevent duplicate provider IDs within the same organization.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mc_org_qbo
    ON public.master_customers(organization_id, quickbooks_customer_id)
    WHERE quickbooks_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mc_org_jobber
    ON public.master_customers(organization_id, jobber_client_id)
    WHERE jobber_client_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mc_org_hubspot
    ON public.master_customers(organization_id, hubspot_contact_id)
    WHERE hubspot_contact_id IS NOT NULL;

-- B-Tree indexes for fast single-column lookups.
CREATE INDEX IF NOT EXISTS idx_master_customers_org
    ON public.master_customers(organization_id);

CREATE INDEX IF NOT EXISTS idx_master_customers_qbo
    ON public.master_customers(quickbooks_customer_id)
    WHERE quickbooks_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_master_customers_jobber
    ON public.master_customers(jobber_client_id)
    WHERE jobber_client_id IS NOT NULL;

-- GIN trigram indexes for fuzzy search across the unified inbox.
-- These let the inbox route do ILIKE '%term%' or similarity() searches
-- without a sequential scan.
CREATE INDEX IF NOT EXISTS idx_master_cust_name_trgm
    ON public.master_customers
    USING gin (first_name gin_trgm_ops, last_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_master_cust_email_trgm
    ON public.master_customers
    USING gin (primary_email gin_trgm_ops);

-- ------------------------------------------------------------
-- AUDIT LEDGER
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.master_customer_audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID,
    organization_id UUID NOT NULL,
    action          VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    before_state    JSONB,
    after_state     JSONB,
    changed_by      VARCHAR(255) DEFAULT 'SYSTEM_SYNC',
    timestamp       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mc_audit_customer
    ON public.master_customer_audit_logs(customer_id);

CREATE INDEX IF NOT EXISTS idx_mc_audit_org_ts
    ON public.master_customer_audit_logs(organization_id, timestamp DESC);

-- ------------------------------------------------------------
-- AUDIT TRIGGER
-- ------------------------------------------------------------
-- Fires after every INSERT, UPDATE, or DELETE on master_customers.
-- Writes before/after snapshots so the full change history is
-- available for disaster recovery without any application-layer code.

CREATE OR REPLACE FUNCTION public.log_master_customer_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.master_customer_audit_logs (
        customer_id,
        organization_id,
        action,
        before_state,
        after_state
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.organization_id, OLD.organization_id),
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_audit_master_customers ON public.master_customers;

CREATE TRIGGER trigger_audit_master_customers
AFTER INSERT OR UPDATE OR DELETE ON public.master_customers
FOR EACH ROW EXECUTE FUNCTION public.log_master_customer_mutation();

-- ------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ------------------------------------------------------------
-- Each company can only see and modify its own master_customers rows.
-- Uses the same is_company_member() helper established in migration 007
-- so the auth check is evaluated once per query, not once per row.

ALTER TABLE public.master_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mc_company_isolation ON public.master_customers;

CREATE POLICY mc_company_isolation ON public.master_customers
    USING (is_company_member(organization_id))
    WITH CHECK (is_company_member(organization_id));

-- Audit log inherits isolation: users can only read logs for their org.
ALTER TABLE public.master_customer_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mc_audit_company_isolation ON public.master_customer_audit_logs;

CREATE POLICY mc_audit_company_isolation ON public.master_customer_audit_logs
    USING (is_company_member(organization_id));
