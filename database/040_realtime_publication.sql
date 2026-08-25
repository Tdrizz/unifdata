-- Enables Supabase Realtime (postgres_changes) on the tables the app now
-- subscribes to client-side for live updates (RealtimeRefresh component).
-- A channel's .subscribe() call succeeds regardless of whether its table
-- is actually in this publication -- the subscription just silently never
-- receives events -- so without this, every "live" subscription in the app
-- would be a no-op.
--
-- NOTE: public.notifications is intentionally excluded. Supabase uses that
-- name internally for its auth system; adding it to supabase_realtime breaks
-- the login flow. If you previously ran a version of this migration that
-- included it, fix your live DB with:
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_ups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_alerts;
