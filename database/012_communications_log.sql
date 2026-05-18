-- UnifData Omnichannel Communications Log
-- Version: 012
-- Purpose:
-- 1. Create communications_log as the unified message thread store.
--    Every inbound and outbound SMS/email event is written here,
--    linked back to master_customers for cross-channel history.
-- 2. Add organization_id for consistent Row-Level Security using
--    the existing is_company_member() helper.
-- 3. Enable Supabase Realtime on this table so the UI receives
--    new messages as INSERT events without polling.

CREATE TABLE IF NOT EXISTS public.communications_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id     UUID REFERENCES public.master_customers(id) ON DELETE SET NULL,
    direction       VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    channel         VARCHAR(10) NOT NULL CHECK (channel IN ('sms', 'email')),
    from_address    TEXT,
    to_address      TEXT,
    subject         TEXT,
    payload         TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'received',
    provider_message_id TEXT,
    timestamp       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comms_org_ts
    ON public.communications_log(organization_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_comms_customer
    ON public.communications_log(customer_id, timestamp DESC);

-- RLS: each company sees only its own message threads.
ALTER TABLE public.communications_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comms_company_isolation ON public.communications_log;

CREATE POLICY comms_company_isolation ON public.communications_log
    USING (is_company_member(organization_id))
    WITH CHECK (is_company_member(organization_id));

-- Enable Supabase Realtime so the inbox UI receives live INSERT events.
-- The publication must include the table; supabase_realtime is the default.
ALTER PUBLICATION supabase_realtime ADD TABLE public.communications_log;
