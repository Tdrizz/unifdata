ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS tier VARCHAR(20) NOT NULL DEFAULT 'standard'
    CHECK (tier IN ('standard', 'pro')),
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}';
