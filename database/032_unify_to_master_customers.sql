-- Migration: Unify legacy customer data into master_customers
-- All new contact creates write to master_customers.
-- Legacy tables (customers, jobs.customer_id, etc.) are DEPRECATED but kept intact.

-- 1. Track which master_customers row came from the legacy customers table
ALTER TABLE master_customers ADD COLUMN IF NOT EXISTS legacy_customer_id UUID;
CREATE INDEX IF NOT EXISTS idx_master_customers_legacy_id ON master_customers(legacy_customer_id) WHERE legacy_customer_id IS NOT NULL;

-- 2. Copy customers → master_customers, skipping rows already imported
INSERT INTO master_customers (
  organization_id,
  first_name,
  last_name,
  primary_email,
  primary_phone,
  billing_address,
  metadata,
  relationship_status,
  source,
  legacy_customer_id,
  created_at
)
SELECT
  c.company_id,
  TRIM(SPLIT_PART(c.name, ' ', 1)),
  NULLIF(TRIM(SUBSTRING(c.name FROM POSITION(' ' IN c.name) + 1)), TRIM(SPLIT_PART(c.name, ' ', 1))),
  c.email,
  c.phone,
  CASE WHEN c.address IS NOT NULL AND c.address <> '' THEN jsonb_build_object('line1', c.address) ELSE NULL END,
  jsonb_strip_nulls(jsonb_build_object(
    'customer_type', c.customer_type,
    'notes', c.notes
  )),
  'active',
  'import',
  c.id,
  c.created_at
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM master_customers mc WHERE mc.legacy_customer_id = c.id
    AND mc.organization_id = c.company_id
);

-- 3. Add contact_id to jobs (non-destructive — customer_id kept as DEPRECATED)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES master_customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_contact_id ON jobs(contact_id) WHERE contact_id IS NOT NULL;

-- 4. Add contact_id to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES master_customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sales_contact_id ON sales(contact_id) WHERE contact_id IS NOT NULL;

-- 5. Add contact_id to follow_ups
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES master_customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_follow_ups_contact_id ON follow_ups(contact_id) WHERE contact_id IS NOT NULL;

-- 6. Backfill contact_id for existing rows via legacy_customer_id mapping
UPDATE jobs j
SET contact_id = mc.id
FROM master_customers mc
WHERE mc.legacy_customer_id = j.customer_id
  AND j.contact_id IS NULL
  AND j.customer_id IS NOT NULL;

UPDATE sales s
SET contact_id = mc.id
FROM master_customers mc
WHERE mc.legacy_customer_id = s.customer_id
  AND s.contact_id IS NULL
  AND s.customer_id IS NOT NULL;

UPDATE follow_ups f
SET contact_id = mc.id
FROM master_customers mc
WHERE mc.legacy_customer_id = f.customer_id
  AND f.contact_id IS NULL
  AND f.customer_id IS NOT NULL;

-- 7. Deprecation comments
COMMENT ON COLUMN jobs.customer_id IS 'DEPRECATED: use contact_id (references master_customers)';
COMMENT ON COLUMN sales.customer_id IS 'DEPRECATED: use contact_id (references master_customers)';
COMMENT ON COLUMN follow_ups.customer_id IS 'DEPRECATED: use contact_id (references master_customers)';
COMMENT ON TABLE customers IS 'DEPRECATED: use master_customers (organization_id) for all new contact writes';
