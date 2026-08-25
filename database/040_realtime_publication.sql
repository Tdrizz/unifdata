-- Enables Supabase Realtime (postgres_changes) on the tables the app now
-- subscribes to client-side for live updates (RealtimeRefresh component,
-- and NotificationBell for `notifications`). A channel's .subscribe() call
-- succeeds regardless of whether its table is actually in this publication
-- -- the subscription just silently never receives events -- so without
-- this, every "live" subscription in the app would be a no-op. Notably,
-- `notifications` was never added despite NotificationBell having relied on
-- it since it was written; this migration is also the fix for that.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_ups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_alerts;
