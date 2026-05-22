-- UnifData Data Keeper Schema
-- Version: 015
-- Purpose:
-- 1. data_reconciliation_proposals — staging table for AI-generated change proposals
--    that fall below the auto-merge confidence threshold. Tenant admins review and
--    approve or reject via the Data Hub UI.
-- 2. ai_data_keeper_audit_logs — append-only ledger of every action the data keeper
--    takes (auto-merge, auto-create, proposal generated). Backend-only; no UI in v1.

BEGIN;

CREATE TABLE IF NOT EXISTS data_reconciliation_proposals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  target_table     VARCHAR(50) NOT NULL DEFAULT 'master_customers',
  target_record_id UUID,
  confidence_score NUMERIC(4,3) NOT NULL,
  proposed_changes JSONB NOT NULL,   -- { updates: { field: { from, to } }, metadata: {...} }
  raw_reasoning    TEXT NOT NULL,
  status           VARCHAR(20) DEFAULT 'PENDING',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_data_keeper_audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_type      VARCHAR(30) NOT NULL,  -- AUTO_MERGE, AUTO_CREATE, PROP_GENERATED
  description      TEXT NOT NULL,
  payload_snapshot JSONB NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_org_status
  ON data_reconciliation_proposals (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_action
  ON ai_data_keeper_audit_logs (organization_id, action_type);

ALTER TABLE data_reconciliation_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proposals_company_isolation ON data_reconciliation_proposals;
CREATE POLICY proposals_company_isolation ON data_reconciliation_proposals
  USING (is_company_member(organization_id)) WITH CHECK (is_company_member(organization_id));

ALTER TABLE ai_data_keeper_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_company_isolation ON ai_data_keeper_audit_logs;
CREATE POLICY audit_logs_company_isolation ON ai_data_keeper_audit_logs
  USING (is_company_member(organization_id));

COMMIT;
