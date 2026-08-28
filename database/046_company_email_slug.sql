-- Each company gets a distinct mailbox name under the shared, already-
-- verified sending domain (e.g. acme-plumbing@unifdata.com instead of one
-- notifications@unifdata.com for every business) -- a real domain-level
-- verification is one per DNS zone, but a mailbox name is free, so this
-- gets every company a recognizable "from" address with no per-tenant DNS
-- work. Nullable: sendEmail() falls back to the shared RESEND_FROM_EMAIL
-- address whenever a company has no slug yet.
alter table public.companies add column if not exists email_slug text;

-- Backfill existing companies from their name, deduping any collisions by
-- appending a numeric suffix (same idea new-company creation uses at the
-- app layer, just done once here in SQL for rows that predate this column).
with base as (
  select id,
         coalesce(nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''), 'business') as slug
  from public.companies
  where email_slug is null
),
numbered as (
  select id, slug, row_number() over (partition by slug order by id) as rn
  from base
)
update public.companies c
set email_slug = case when n.rn = 1 then n.slug else n.slug || '-' || n.rn end
from numbered n
where c.id = n.id;

create unique index if not exists companies_email_slug_key on public.companies(email_slug) where email_slug is not null;
