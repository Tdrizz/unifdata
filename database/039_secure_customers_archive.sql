-- 039_secure_customers_archive.sql
--
-- The customers_archive snapshot (created in 037 before dropping the legacy
-- customers table) is a public-schema table exposed via PostgREST with no RLS.
-- Without RLS, any authenticated user could read every tenant's archived
-- customer PII cross-tenant. It is a cold backup the app never queries, so lock
-- it down: enable RLS with no policies (service-role bypasses RLS; anon and
-- authenticated get nothing) and revoke the PostgREST role grants.

ALTER TABLE public.customers_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customers_archive FROM anon, authenticated;
