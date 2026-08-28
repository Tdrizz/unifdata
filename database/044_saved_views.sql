-- Saved views: a personal list of named filter combinations per user, so a
-- filter set on the Customers list or Pipeline board (built from status/
-- tag/source/q query params, or the pipeline's follow-up chip) can be saved
-- as a tab and returned to later. Deliberately NOT a sharing/permissions
-- system -- one user's saved views are invisible to every other member of
-- the same company, enforced below via user_id in the RLS policy, not just
-- organization_id like every other isolation policy in this file set.

CREATE TABLE IF NOT EXISTS saved_views (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page             VARCHAR(20) NOT NULL,
  name             TEXT NOT NULL,
  filters          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, user_id, page, name)
);

-- Covers the "list my saved tabs for this page" fetch every list/board page
-- makes on load -- filter by org + user + page, no sort needed since a
-- user's own view count is always small.
CREATE INDEX IF NOT EXISTS idx_saved_views_owner ON saved_views (organization_id, user_id, page);

ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

-- Personal, not shared: is_company_member(organization_id) alone (the usual
-- isolation policy) would let any teammate at the same company read or
-- overwrite another member's saved views. The extra `user_id = auth.uid()`
-- clause is what actually makes this a personal list rather than a
-- company-wide one.
CREATE POLICY saved_views_isolation ON saved_views
  USING (is_company_member(organization_id) AND user_id = auth.uid())
  WITH CHECK (is_company_member(organization_id) AND user_id = auth.uid());
