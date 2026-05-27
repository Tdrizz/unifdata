-- Contact relationship status fields + activity + notes + tags
ALTER TABLE master_customers
  ADD COLUMN IF NOT EXISTS relationship_status VARCHAR(20) DEFAULT 'active'
    CHECK (relationship_status IN ('new', 'active', 'inactive', 'on_hold', 'closed')),
  ADD COLUMN IF NOT EXISTS source              VARCHAR(40),
  ADD COLUMN IF NOT EXISTS source_detail       TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to         UUID;

CREATE TABLE IF NOT EXISTS contact_activity (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id       UUID NOT NULL REFERENCES public.master_customers(id) ON DELETE CASCADE,
  event_type       VARCHAR(50) NOT NULL,
  event_label      TEXT NOT NULL,
  event_detail     TEXT,
  reference_id     UUID,
  reference_type   VARCHAR(40),
  source           VARCHAR(20) DEFAULT 'system',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_contact ON contact_activity (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_org     ON contact_activity (organization_id, created_at DESC);
ALTER TABLE contact_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_isolation ON contact_activity USING (is_company_member(organization_id));

CREATE TABLE IF NOT EXISTS contact_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id       UUID NOT NULL REFERENCES public.master_customers(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  pinned           BOOLEAN NOT NULL DEFAULT false,
  author_name      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_contact ON contact_notes (contact_id, pinned DESC, created_at DESC);
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY notes_isolation ON contact_notes USING (is_company_member(organization_id));

CREATE TABLE IF NOT EXISTS tags (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name             VARCHAR(50) NOT NULL,
  color            VARCHAR(20) DEFAULT '#6B7280',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, name)
);
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tags_isolation ON tags USING (is_company_member(organization_id));

CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id       UUID NOT NULL REFERENCES public.master_customers(id) ON DELETE CASCADE,
  tag_id           UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  applied_at       TIMESTAMPTZ DEFAULT NOW(),
  applied_by       VARCHAR(20) DEFAULT 'manual',
  PRIMARY KEY (contact_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON contact_tags (tag_id);
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY contact_tags_isolation ON contact_tags
  USING (EXISTS (
    SELECT 1 FROM master_customers c
    WHERE c.id = contact_id AND is_company_member(c.organization_id)
  ));
