-- Agent memory: per-signal, per-customer history for suppression and escalation tracking.

CREATE TABLE IF NOT EXISTS agent_memory (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  signal_type     text        NOT NULL,
  customer_id     uuid        REFERENCES customers(id) ON DELETE SET NULL,
  last_fired_at   timestamptz NOT NULL DEFAULT now(),
  fire_count      int         NOT NULL DEFAULT 1,
  last_outcome    text        CHECK (last_outcome IN ('approved', 'rejected')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_memory_org_signal_customer_idx
  ON agent_memory (organization_id, signal_type, customer_id)
  WHERE customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agent_memory_org_signal_null_idx
  ON agent_memory (organization_id, signal_type)
  WHERE customer_id IS NULL;

CREATE INDEX IF NOT EXISTS agent_memory_org_idx ON agent_memory (organization_id);

ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read agent_memory"
  ON agent_memory FOR SELECT
  USING (
    organization_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- Add escalation_level + signal_type to agent_drafts
ALTER TABLE agent_drafts ADD COLUMN IF NOT EXISTS escalation_level int NOT NULL DEFAULT 0;
ALTER TABLE agent_drafts ADD COLUMN IF NOT EXISTS signal_type text;

-- Add escalation_level to agent_alerts
ALTER TABLE agent_alerts ADD COLUMN IF NOT EXISTS escalation_level int NOT NULL DEFAULT 0;

-- Add assessment column to agent_logs so the manager's summary can be stored and reused
ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS assessment text;
