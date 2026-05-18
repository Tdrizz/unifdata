-- Add notification_preferences JSONB column to companies.
-- Stores per-workspace toggle state for in-app notification types.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB
    NOT NULL
    DEFAULT '{"overdue_followups": true, "pipeline_activity": true, "unpaid_invoices": false, "ai_brief": true}'::jsonb;
