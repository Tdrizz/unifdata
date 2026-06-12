-- Persist the Stripe customer id on the user profile. Applied to production 2026-06-12.
-- Until now webhooks located users by searching Stripe metadata — fragile and slow.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key ON public.profiles (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
