-- Event log for automated agent signals (churn, pricing, etc.)
CREATE TABLE IF NOT EXISTS agent_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type       VARCHAR(60) NOT NULL,
  entity_type      VARCHAR(40),
  entity_id        UUID,
  payload          JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_org_time
  ON agent_events (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_events_entity
  ON agent_events (entity_type, entity_id);

ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_events_isolation ON agent_events
  USING (is_company_member(organization_id))
  WITH CHECK (is_company_member(organization_id));
