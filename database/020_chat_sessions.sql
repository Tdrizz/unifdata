CREATE TABLE IF NOT EXISTS chat_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title            TEXT,
  messages         JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chat_sessions_org ON chat_sessions (organization_id, updated_at DESC);
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY chat_sessions_isolation ON chat_sessions
  USING (is_company_member(organization_id)) WITH CHECK (is_company_member(organization_id));
