-- 038_drop_smart_groups.sql
--
-- The smart_groups feature was never shipped (no creation UI, zero rows) and is
-- referenced by no code path. Retire the orphaned table. CASCADE removes its RLS
-- policies and any dependent constraints.

DROP TABLE IF EXISTS public.smart_groups CASCADE;
