-- Sample data seeded right after onboarding, so the Pipeline board isn't
-- empty on day one -- an empty board reads as broken, not clean, and gives
-- Vera nothing true to report on a brand-new account.
--
-- `is_sample` marks exactly the rows this app inserted for that purpose, so
-- "Remove sample data" (Settings) can delete precisely those rows and never
-- a real record a customer happened to name similarly. Only added to the
-- tables the seeder actually writes to.

ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.jobs             ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.sales            ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;

-- Fast "does this org still have sample data" check for the Settings action
-- and the onboarding-completion seeder's own once-only guard.
CREATE INDEX IF NOT EXISTS idx_master_customers_org_sample ON public.master_customers (organization_id) WHERE is_sample;
CREATE INDEX IF NOT EXISTS idx_jobs_org_sample ON public.jobs (company_id) WHERE is_sample;
CREATE INDEX IF NOT EXISTS idx_sales_org_sample ON public.sales (company_id) WHERE is_sample;
