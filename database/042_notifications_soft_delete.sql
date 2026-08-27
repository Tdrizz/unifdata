-- Notifications "clear" used to be a hard DELETE, which broke the overdue
-- follow-up dedup check in api/cron/sync -- that check scans surviving
-- notification bodies for an embedded follow-up ID, so clearing a
-- notification erased the only record that it had already fired,
-- causing the same notification to be re-inserted the next day. Soft-delete
-- instead: clearing sets cleared_at, the dedup check keeps seeing the row,
-- and the UI just filters cleared_at is null.
alter table public.notifications add column if not exists cleared_at timestamptz;

create index if not exists idx_notifications_company_cleared
on public.notifications(company_id, cleared_at, created_at desc);
