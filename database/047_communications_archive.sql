-- Lets a conversation be removed from the Communications inbox without
-- destroying the underlying message history (a customer's texts/emails are
-- real business records) -- same soft-delete shape as notifications'
-- cleared_at. A new inbound message, or the user messaging the contact
-- again, revives an archived thread rather than leaving it stuck hidden.
alter table public.communications add column if not exists archived_at timestamptz;
