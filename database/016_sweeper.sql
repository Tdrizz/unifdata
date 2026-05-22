-- UnifData Proactive Sweeper Schema
-- Version: 016
-- Adds sweep-tracking state to master_customers and a trigger that re-queues
-- records for re-evaluation whenever their identity fields change externally.

BEGIN;

ALTER TABLE master_customers
  ADD COLUMN IF NOT EXISTS keeper_sweep_status VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS keeper_last_swept_at TIMESTAMPTZ DEFAULT NULL;

-- Partial index for the sweeper batch query: unswept records ordered by
-- lowest data health first (most likely to yield useful dedup candidates).
CREATE INDEX IF NOT EXISTS idx_master_customers_sweep_pending
  ON master_customers (organization_id, data_health_score ASC, created_at ASC)
  WHERE keeper_sweep_status IS NULL OR keeper_sweep_status = 'pending';

-- Trigger function: reset sweep status when identity fields change so the
-- sweeper re-evaluates records that were manually edited or re-synced.
CREATE OR REPLACE FUNCTION reset_keeper_sweep_status()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.first_name IS DISTINCT FROM OLD.first_name OR
    NEW.last_name  IS DISTINCT FROM OLD.last_name  OR
    NEW.primary_email IS DISTINCT FROM OLD.primary_email OR
    NEW.primary_phone IS DISTINCT FROM OLD.primary_phone
  ) THEN
    NEW.keeper_sweep_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reset_sweep_status ON master_customers;
CREATE TRIGGER trg_reset_sweep_status
  BEFORE UPDATE ON master_customers
  FOR EACH ROW
  EXECUTE FUNCTION reset_keeper_sweep_status();

COMMIT;
