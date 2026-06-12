-- Security hardening (Supabase advisor remediation). Applied to production 2026-06-12.
-- 1. SECURITY DEFINER functions must not be callable from the public API roles.
--    The app only invokes these via the service-role client.
REVOKE EXECUTE ON FUNCTION public.fetch_master_customer_candidates(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_org_scope(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_master_customer_mutation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_company(text, text, text) FROM PUBLIC, anon, authenticated;
-- NOTE: is_company_member / is_company_admin keep their authenticated grant —
-- they are referenced by RLS policies and must be executable by querying roles.

-- 2. Pin search_path on functions flagged as role-mutable.
ALTER FUNCTION public.search_customers_by_embedding(uuid, vector, integer) SET search_path = public;
ALTER FUNCTION public.search_sales_by_embedding(uuid, vector, integer) SET search_path = public;
ALTER FUNCTION public.search_jobs_by_embedding(uuid, vector, integer) SET search_path = public;
ALTER FUNCTION public.reset_keeper_sweep_status() SET search_path = public;

-- Manual ops items (cannot be set via SQL):
-- * Enable leaked-password protection: Supabase Dashboard -> Auth -> Passwords.
-- * pg_trgm / vector extensions live in public schema (advisor WARN) — moving
--   them is disruptive and deferred intentionally.
