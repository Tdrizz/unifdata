CREATE TABLE IF NOT EXISTS automations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  trigger_type     VARCHAR(50) NOT NULL,
  trigger_config   JSONB NOT NULL DEFAULT '{}',
  conditions       JSONB NOT NULL DEFAULT '[]',
  actions          JSONB NOT NULL DEFAULT '[]',
  run_count        INT NOT NULL DEFAULT 0,
  last_triggered   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY automations_isolation ON automations USING (is_company_member(organization_id));

CREATE TABLE IF NOT EXISTS automation_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  automation_id    UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  contact_id       UUID REFERENCES public.master_customers(id) ON DELETE SET NULL,
  triggered_by     TEXT,
  actions_taken    JSONB,
  status           VARCHAR(20) DEFAULT 'success',
  error            TEXT,
  run_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_runs_automation ON automation_runs (automation_id, run_at DESC);
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY runs_isolation ON automation_runs USING (is_company_member(organization_id));
