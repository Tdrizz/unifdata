CREATE TABLE IF NOT EXISTS communications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id       UUID REFERENCES public.master_customers(id) ON DELETE SET NULL,
  contact_phone    VARCHAR(30),
  channel          VARCHAR(20) NOT NULL DEFAULT 'sms',
  unread_count     INT NOT NULL DEFAULT 0,
  last_message_at  TIMESTAMPTZ,
  last_message_preview TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comms_contact_channel ON communications (organization_id, contact_id, channel)
  WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comms_org_last ON communications (organization_id, last_message_at DESC);
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY comms_isolation ON communications USING (is_company_member(organization_id));

CREATE TABLE IF NOT EXISTS communication_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  direction        VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body             TEXT NOT NULL,
  status           VARCHAR(20) DEFAULT 'sent',
  twilio_sid       VARCHAR(60),
  sent_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_comm ON communication_messages (communication_id, sent_at ASC);
ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY comm_messages_isolation ON communication_messages
  USING (is_company_member(organization_id));
