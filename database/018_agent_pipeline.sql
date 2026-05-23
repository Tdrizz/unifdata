-- Manager Agent output buffer (Co-Pilot mode staging area)
CREATE TABLE IF NOT EXISTS agent_drafts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  draft_type       VARCHAR(40) NOT NULL,
  record_id        UUID,
  subject          TEXT,
  body             TEXT NOT NULL,
  recipient_info   JSONB DEFAULT '{}',
  action_label     TEXT,
  approve_action   VARCHAR(40),
  approve_args     JSONB DEFAULT '{}',
  status           VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_applied')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_agent_drafts_org_status ON agent_drafts (organization_id, status, created_at DESC);
ALTER TABLE agent_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_drafts_isolation ON agent_drafts
  USING (is_company_member(organization_id)) WITH CHECK (is_company_member(organization_id));

-- UI notification cards from Alert Formatter worker
CREATE TABLE IF NOT EXISTS agent_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_type       VARCHAR(40) NOT NULL,
  severity         VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  record_id        UUID,
  status           VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_agent_alerts_org_status ON agent_alerts (organization_id, status, created_at DESC);
ALTER TABLE agent_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_alerts_isolation ON agent_alerts
  USING (is_company_member(organization_id)) WITH CHECK (is_company_member(organization_id));

-- Agent run logs (one row per worker run)
CREATE TABLE IF NOT EXISTS agent_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID,
  agent_name       VARCHAR(40) NOT NULL,
  run_at           TIMESTAMPTZ DEFAULT NOW(),
  signals_checked  INT DEFAULT 0,
  events_fired     INT DEFAULT 0,
  autopilot        BOOLEAN DEFAULT FALSE,
  error            TEXT
);

-- ROI tracking: automated actions that recovered revenue
CREATE TABLE IF NOT EXISTS roi_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type       VARCHAR(40) NOT NULL,
  amount_recovered NUMERIC(12, 2),
  record_id        UUID,
  triggered_by     VARCHAR(40),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE roi_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY roi_events_isolation ON roi_events
  USING (is_company_member(organization_id));
