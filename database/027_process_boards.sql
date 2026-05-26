CREATE TABLE IF NOT EXISTS process_boards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  is_default       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_boards_default ON process_boards (organization_id) WHERE is_default = true;
ALTER TABLE process_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY boards_isolation ON process_boards USING (is_company_member(organization_id));

CREATE TABLE IF NOT EXISTS board_stages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id         UUID NOT NULL REFERENCES public.process_boards(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  position         INT NOT NULL,
  color            VARCHAR(20) DEFAULT '#6B7280',
  stage_type       VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (stage_type IN ('active', 'completed', 'cancelled', 'on_hold'))
);
CREATE INDEX IF NOT EXISTS idx_stages_board ON board_stages (board_id, position);
ALTER TABLE board_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY stages_isolation ON board_stages USING (is_company_member(organization_id));

CREATE TABLE IF NOT EXISTS process_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id       UUID NOT NULL REFERENCES public.master_customers(id) ON DELETE CASCADE,
  board_id         UUID NOT NULL REFERENCES public.process_boards(id) ON DELETE CASCADE,
  stage_id         UUID NOT NULL REFERENCES public.board_stages(id) ON DELETE RESTRICT,
  name             TEXT NOT NULL,
  value            NUMERIC(12, 2),
  target_date      DATE,
  status           VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
  closed_reason    TEXT,
  source           VARCHAR(40),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_records_board   ON process_records (board_id, stage_id, status);
CREATE INDEX IF NOT EXISTS idx_records_contact ON process_records (contact_id);
ALTER TABLE process_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY records_isolation ON process_records USING (is_company_member(organization_id));
