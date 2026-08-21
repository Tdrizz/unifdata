-- 035_company_subscription_status.sql
--
-- Company-level subscription flag so access reflects the company's LIVE billing
-- state rather than only the paying owner's Clerk metadata. Previously the Stripe
-- webhook flipped only the owner's Clerk `subscribed` flag, so an invited member
-- kept full access indefinitely after the owner cancelled or the card lapsed.
-- The Stripe webhook maintains this column from here on; `requireSubscription`
-- gates invited members on it.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS subscription_active boolean NOT NULL DEFAULT false;

-- Grandfather all existing companies as active so no current customer is locked
-- out on deploy. Webhooks keep it current going forward.
UPDATE public.companies SET subscription_active = true;
