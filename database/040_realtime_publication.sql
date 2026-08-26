-- Enables Supabase Realtime (postgres_changes) on the tables the app now
-- subscribes to client-side for live updates (RealtimeRefresh component).
-- A channel's .subscribe() call succeeds regardless of whether its table
-- is actually in this publication -- the subscription just silently never
-- receives events -- so without this, every "live" subscription in the app
-- would be a no-op.
--
-- public.notifications was originally included here too (for
-- NotificationBell), then dropped from the live publication during the
-- 2026-08-25 login-outage investigation on a theory that it was the cause.
-- That theory doesn't hold up: this app authenticates via Clerk, not
-- Supabase Auth, `notifications` is an ordinary app table (has a proper
-- primary key/replica identity -- checked directly), and no Postgres error
-- ever appeared in the logs around the incident. The actual cause was a
-- Next.js route conflict (see the same fix's PR). Left excluded here
-- deliberately for now, matching the current live state, rather than
-- re-litigating it mid-incident -- worth re-adding as its own follow-up
-- once the outage fix is confirmed.
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_ups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_alerts;
