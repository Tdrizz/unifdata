-- 037_drop_legacy_customers.sql
--
-- Final step of the customers -> master_customers unification. All reads and
-- writes now target master_customers (deployed in the cutover); the legacy
-- customers table is referenced by zero code paths. This retires it.
--
-- A full snapshot is kept in customers_archive for recoverability. CASCADE drops
-- the dependent FK constraints on jobs/sales/follow_ups/leads/agent_memory (their
-- deprecated customer_id columns remain as plain uuids, already superseded by
-- contact_id) and the customers_embedding_hnsw index.

CREATE TABLE IF NOT EXISTS public.customers_archive AS TABLE public.customers;

-- Embedding search was customer-embedding based; embeddings were never populated
-- (0 rows) and the semantic search was removed from the code.
DROP FUNCTION IF EXISTS public.search_customers_by_embedding(uuid, vector, integer);

DROP TABLE IF EXISTS public.customers CASCADE;
