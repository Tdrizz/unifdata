-- 036_agent_memory_contact_link.sql
--
-- Prep for the customers -> master_customers cutover. agent_memory is the last
-- table that references the legacy `customers` table exclusively (via
-- customer_id). Add a master link and backfill it so the legacy FK can be
-- severed when the legacy table is dropped. Additive and reversible.

ALTER TABLE public.agent_memory
  ADD COLUMN IF NOT EXISTS contact_id uuid
  REFERENCES public.master_customers(id) ON DELETE SET NULL;

UPDATE public.agent_memory am
SET contact_id = m.id
FROM public.master_customers m
WHERE m.legacy_customer_id = am.customer_id
  AND am.contact_id IS NULL;
