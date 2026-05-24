/**
 * Integration sync status:
 *
 * QuickBooks:
 *   - Inbound webhook: ✓ (Invoice events → stamps source_system/last_synced_at on existing sales; enqueues overdue-invoice job)
 *   - Inbound sync (pull): ✓ (Customers → master_customers with name, email, phone, address, customer_type; Invoices → sales via import session with amount, payment_status, sale_date, service_type, source; Estimates → leads via import session)
 *   - Outbound sync: ✗ (not implemented — requires QB write API + field mapping review)
 *   - Field coverage: name ✓, email ✓, phone ✓, address ✓, customer_type ✓, amount ✓, payment_status ✓, sale_date ✓, source_system ✓, last_synced_at ✓
 *   - Missing: invoice_number is embedded in service_type ("Invoice {DocNumber}"), not a separate column
 *
 * HubSpot:
 *   - Inbound webhook: ✗ (no webhook handler)
 *   - Inbound sync (pull): ✓ (contacts → master_customers via import session)
 *   - Outbound sync: ✗ (not implemented)
 *   - Field coverage: see src/lib/integrations/hubspot.ts
 *
 * Jobber:
 *   - Inbound webhook: ✓ (src/app/api/webhooks/jobber/route.ts — request events → jobs)
 *   - Inbound sync (pull): ✓ (clients + requests via import session)
 *   - Outbound sync: ✗ (not implemented)
 *   - Field coverage: see src/lib/integrations/jobber.ts
 *
 * Square:
 *   - Inbound webhook: ✗ (no webhook handler)
 *   - Inbound sync (pull): ✓ (customers + orders via import session)
 *   - Outbound sync: ✗ (not implemented)
 *   - Field coverage: see src/lib/integrations/square.ts
 *
 * Stripe:
 *   - Inbound webhook: ✗ (no webhook handler)
 *   - Inbound sync (pull): ✓ (customers + charges via import session)
 *   - Outbound sync: ✗ (not implemented)
 *   - Field coverage: see src/lib/integrations/stripe.ts
 *
 * Google Sheets:
 *   - Inbound: ✓ (manual pull via picker; maps any spreadsheet to relationships/revenue/opportunities)
 *   - Outbound: ✗ (not implemented)
 *
 * TODO outbound sync: all integrations require write API credentials and a defined
 * conflict-resolution strategy (local wins vs. remote wins per field). Not in scope for pilot.
 */

export { registerSyncer, getSyncer } from "./registry";
export { registerRefresher, refreshIntegrationToken } from "./token";
