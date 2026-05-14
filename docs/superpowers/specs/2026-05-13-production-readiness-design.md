# Production Readiness Design

**Date:** 2026-05-13  
**Status:** Approved  
**Context:** Phase A (architecture rebuild) is complete. This pass brings FrontierOps to production quality — polished UX, working core features, and fully functional data integrations — before Phase B (multi-user/teams).

---

## Goal

Make FrontierOps feel like trustworthy, polished SaaS software where every user action gets feedback, every page loads gracefully, data imports work even with messy files, and all five integrations actually sync data rather than just showing "Connected."

---

## Section 1: User Feedback Layer

### Problem
Every server action — creating a customer, deleting a job, updating settings — is completely silent on success. The only feedback mechanism is a `?error=` URL redirect, which is easy to miss and leaves users unsure whether their action worked.

### What we build

**Toast system (Sonner)**  
Install Sonner and add the `<Toaster />` to the root layout. All 25+ server actions across `customers`, `leads`, `jobs`, `sales`, `follow-ups`, and `settings` feature modules get `toast.success()` / `toast.error()` calls. The `?error=` redirect pattern stays as a fallback for hard redirects but stops being the primary feedback mechanism.

**Loading states**  
Add `loading.tsx` files for all 9 route segments (`/workspace`, `/customers`, `/leads`, `/jobs`, `/sales`, `/follow-ups`, `/crm`, `/imports`, `/ai-assistant`, `/settings`, `/data-hub`). These render immediately inside the `AppShell` so the shell never flickers.

**DeleteConfirm fix**  
`DeleteConfirm.tsx` currently has no loading state — the delete button stays clickable after the first click, enabling double-deletes. Fix: disable the button and show a spinner from the moment it's clicked until navigation completes.

### Acceptance criteria
- Every server action shows a toast on success and on error
- Every route segment has a `loading.tsx` that renders a skeleton inside the app shell
- DeleteConfirm cannot be double-clicked

---

## Section 2: Broken Core Features

### Problem
Search and pagination exist in the UI but do not work. The search input writes `?q=` to the URL but the data is never filtered. Page numbers render but clicking them does nothing.

### What we build

**Server-side search**  
Pass `searchParams.q` from each list page into the feature module query functions. Add `.ilike("name", `%${q}%`)` (or equivalent field) to the Supabase queries for customers, leads, jobs, and sales. Wrap the page content in a `<Suspense>` boundary so search updates trigger a server-side re-render without a full page reload. Add a `useSearchParams`-based search input component in each feature's components folder.

**Server-side pagination**  
Add `?page=` param support. Each list query uses `.range(offset, offset + pageSize - 1)` and `{ count: "exact" }` to get the total row count. A shared `<Pagination>` UI component renders previous/next + page numbers based on `totalCount / pageSize`. Default page size: 25 rows.

**Scope:** Customers, leads, jobs, sales list pages.

### Acceptance criteria
- Typing in search filters the list within 300ms (server re-render)
- Pagination navigates correctly and shows the right subset of rows
- Empty search result shows `EmptyState` with a "Clear search" action
- URL reflects current `?q=` and `?page=` params (shareable, bookmarkable)

---

## Section 3: Auth & Navigation Polish

### Problem
Small gaps that make the app feel unfinished to a new business: logged-in users can still visit `/login`, mobile nav is easy to miss, and a brand-new workspace shows blank tables with no direction.

### What we build

**Auth redirect**  
`/login` and `/signup` check for an existing Supabase session at the top of the Server Component. If the user is already authenticated, `redirect("/workspace")` immediately.

**Mobile bottom tab bar**  
Replace the horizontal-scroll chip nav on mobile with a fixed bottom tab bar for the 5 primary sections (Workspace, Customers, Jobs, Sales, Follow-ups). The current `AppNav` mobile implementation (`flex gap-2 overflow-x-auto`) is invisible to many users. The bottom bar is a standard mobile pattern.

**Empty state onboarding**  
When the workspace has zero customers (first-time user), show a welcome card in the Workspace view with a short description and a "Add your first customer" CTA. Replace blank tables with `EmptyState` components that include a relevant action button (not just "Nothing here yet").

**Password change security**  
The settings form currently accepts a new password with no verification of the current one. Add a "Current password" field and verify it against Supabase auth before allowing the update. Display a clear inline error if verification fails.

### Acceptance criteria
- Visiting `/login` while authenticated redirects to `/workspace`
- Mobile users see a bottom tab bar with the 5 primary nav items
- A new workspace (0 customers) shows a welcome card with a CTA
- Password change requires and validates the current password

---

## Section 4: Form & Validation

### Problem
Forms accept bad data (negative values, invalid emails) and the only error signal is a URL redirect — which requires a full page round-trip and loses the form state.

### What we build

**Inline validation errors**  
Server action errors return structured field-level errors instead of redirecting to `?error=`. Use `useActionState` (Next.js) in form components to display errors inline next to the relevant field without losing form state. Required fields show "This field is required." Email fields show "Enter a valid email address." Numeric fields show "Must be a positive number."

**Server-side validation**  
Add validation in each feature's `actions.ts` before the Supabase write:
- `customers`: name required, email format if provided, phone format if provided
- `leads`: service_requested required, estimated_value ≥ 0
- `jobs`: service_type required, job_value ≥ 0
- `sales`: amount > 0
- `follow-ups`: message required, due_date valid date

### Acceptance criteria
- Submitting a form with missing required fields shows inline errors without a page redirect
- Negative monetary values are rejected server-side with an inline error
- Invalid email format is caught and shown inline

---

## Section 5: Import Polish

### Problem
The import engine is intelligent (column synonym matching, duplicate detection, row-level editing) but the UX obscures it. Users upload a CSV and jump straight to the review page with no visibility into which columns were mapped — silently dropped columns only surface as missing data scattered across hundreds of rows. Excel files fail entirely. Resolving 50 duplicate rows requires 50 individual button clicks.

### What we build

**Column mapping confirmation step**  
After the file is parsed and before `createImportSessionFromRows` is called, show a mapping confirmation step in `CsvImportSessionFlow`. The API already returns `headers` and `mapping` in the response — surface these as an editable table:

```
Your column        →   FrontierOps field
"Client"           →   Name               [dropdown]
"Cell #"           →   Phone              [dropdown]
"E-mail address"   →   Email              [dropdown]
"Region"           →   Not imported       [dropdown]
```

Each row has a dropdown of available target fields + "Don't import this column." The user confirms (or adjusts) then analysis runs with the confirmed mapping passed as `formData.mapping`. This is the most important UX fix for messy data.

**Excel (.xlsx) support**  
Add the `xlsx` npm package. In the CSV API route, detect `.xlsx` by MIME type or extension and parse it with `xlsx.read()` before the existing CSV path. Output is the same `{ headers, rows }` shape, so everything downstream is unchanged.

**CSV template downloads**  
Add a "Download template" link for each record type. The templates are static CSV files committed to `public/templates/` with the correct column headers and one example row.

**Bulk duplicate resolution**  
In `ImportSessionReviewClient`, add "Skip all duplicates" and "Update all matched records" buttons above the row list when there are 3+ duplicates. These call a new PATCH endpoint `PATCH /api/import-sessions/[id]/rows/bulk` that accepts `{ action: "skip" | "update_existing", filter: "duplicates" }`.

**Better error row guidance**  
Replace the generic "Needs fix" banner with field-specific messages from `validation_errors`. Example: "Name is required — edit this row or skip it." Add a "Skip this row" button directly on error rows (same as duplicate rows already have).

### Acceptance criteria
- Column mapping step appears between upload and review; unmapped columns are clearly surfaced
- `.xlsx` files upload and parse correctly
- Template CSVs download for all 5 record types
- "Skip all duplicates" resolves all duplicate rows in one click
- Error rows show specific field-level guidance and have a skip button

---

## Section 6: Integration Sync

### Problem
OAuth connect routes exist for QuickBooks, HubSpot, Jobber, Square, and Stripe, but there is zero sync logic. Connecting any of these integrations results in a "Connected" badge and nothing else. Tokens are never refreshed, so connections silently expire.

### Architecture

An extensible sync registry. Each integration is a module in `src/lib/integrations/` that implements a standard interface:

```ts
interface IntegrationSyncer {
  provider: string;
  syncToFrontierOps(supabase, companyId, integration): Promise<SyncResult>
}
```

A shared `runIntegrationSync(provider, companyId)` function looks up the integration record, refreshes the token if needed, calls the provider's syncer, and writes a `sync_run` record with the result. Adding a new integration later = adding one file to `src/lib/integrations/`.

Data from all integrations flows through the **existing import session review flow** — records are staged, the user sees them in the review UI, and commits them. This means users always approve what comes in. No silent overwrites.

**Token refresh**  
Each integration record stores `access_token`, `refresh_token`, and `expires_at`. A `refreshIntegrationToken(integration)` utility in `src/lib/integrations/token.ts` handles provider-specific refresh calls and updates the `integrations` table. Called automatically before every sync.

### Per-integration sync scope

**QuickBooks**  
- Customers → customers (name, email, phone, address)
- Invoices → sales (amount, payment_status, sale_date, service_type)
- Estimates → leads (service_requested, estimated_value, status)
- API: QuickBooks Online REST API v3, OAuth2

**HubSpot**  
- Contacts → customers (name, email, phone)
- Deals → leads (service_requested, estimated_value, status, source)
- Notes/Tasks → follow-ups (message, due_date, status)
- API: HubSpot CRM API v3, OAuth2

**Jobber**  
- Clients → customers (name, email, phone, address)
- Jobs → jobs (service_type, status, job_value, start_date, completed_date)
- Invoices → sales (amount, payment_status, sale_date)
- API: Jobber GraphQL API, OAuth2

**Square**  
- Customers → customers (name, email, phone, address)
- Transactions/Payments → sales (amount, payment_status, sale_date)
- API: Square Connect API v2, OAuth2

**Stripe**  
- Customers → customers (name, email, phone)
- Charges/PaymentIntents → sales (amount, payment_status, sale_date)
- API: Stripe API, restricted key (not OAuth — use secret key stored in integration record)

### UX

On the Imports page, each connected integration shows:
- Integration name + logo
- "Last synced: X minutes ago" (or "Never synced")
- "Sync now" button → triggers `POST /api/integrations/[provider]/sync` → queues a sync run → returns immediately with a "Sync started" toast → page refreshes after 3s to show the new sync run in history

Sync runs appear in the existing import history table with `source_type = provider`.

### Settings page integration panel
The existing integrations section in Settings gains a "Sync now" button per connected integration and shows the last sync timestamp. Disconnecting an integration invalidates the token and removes the integration record.

### Acceptance criteria
- Connecting any of the 5 integrations and clicking "Sync now" stages records in the import review flow
- Token refresh runs automatically; expired tokens do not cause silent failures — they surface as an inline "Reconnect [Provider]" prompt
- Sync history shows in the Imports page with record counts
- Adding a new integration provider requires only one new file in `src/lib/integrations/`

---

## Implementation Order

1. **Section 1** (User Feedback) — immediate visibility improvement, touches every feature module
2. **Section 2** (Search + Pagination) — visible feature failures, high user impact
3. **Section 5** (Import Polish) — column mapping is the core value prop for onboarding
4. **Section 6** (Integration Sync) — the largest section, depends on import flow being polished
5. **Section 3** (Auth + Nav) — polish, parallel-safe with Section 4
6. **Section 4** (Validation) — hardening, can run concurrently with Section 3

---

## Out of Scope

- Multi-user / teams (Phase B)
- Scheduled/automatic sync cadences (Phase C follow-on)
- Real-time sync webhooks (Phase C follow-on)
- New record types beyond the existing 5 categories
