CREATE TABLE IF NOT EXISTS smart_groups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  match_type       VARCHAR(5) NOT NULL DEFAULT 'all',
  rules            JSONB NOT NULL DEFAULT '[]',
  contact_count    INT DEFAULT 0,
  last_evaluated   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE smart_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY smart_groups_isolation ON smart_groups USING (is_company_member(organization_id));

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type      VARCHAR(20) NOT NULL DEFAULT 'contact',
  label            TEXT NOT NULL,
  field_key        VARCHAR(50) NOT NULL,
  field_type       VARCHAR(20) NOT NULL,
  options          JSONB,
  required         BOOLEAN NOT NULL DEFAULT false,
  position         INT NOT NULL DEFAULT 0,
  UNIQUE (organization_id, entity_type, field_key)
);
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY custom_fields_isolation ON custom_field_definitions USING (is_company_member(organization_id));

CREATE TABLE IF NOT EXISTS custom_field_values (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type      VARCHAR(20) NOT NULL,
  entity_id        UUID NOT NULL,
  field_id         UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  value            TEXT,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_field_values_entity ON custom_field_values (entity_id, field_id);
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY field_values_isolation ON custom_field_values USING (is_company_member(organization_id));
