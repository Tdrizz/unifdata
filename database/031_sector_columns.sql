-- Add sector_id and profile_overrides to companies
-- sector_id maps to the IndustryProfile id (e.g. 'dental', 'legal')
-- profile_overrides allows org-level label overrides (stored as JSON)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS sector_id         VARCHAR(40),
  ADD COLUMN IF NOT EXISTS profile_overrides JSONB DEFAULT '{}';
