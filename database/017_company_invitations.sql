BEGIN;

CREATE TABLE IF NOT EXISTS company_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  token        TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_invitations_company
  ON company_invitations (company_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_token
  ON company_invitations (token);

ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;

-- Owners can see and manage invitations for their company.
CREATE POLICY company_invitations_owner_access ON company_invitations
  USING (is_company_member(company_id))
  WITH CHECK (is_company_member(company_id));

COMMIT;
