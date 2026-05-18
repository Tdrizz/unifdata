=========================================
UNIFDATA SYSTEM UPGRADE SPECIFICATION (v3.0)
=========================================

Hey Claude, we are upgrading UnifData from a passive dashboard to an active bidirectional CRM sync engine. Read through this entire prompt to index our repo and understand the architectural plan. Do not write any code yet.

-----------------------------------------
PART 1: ARCHITECTURAL BLUEPRINT
-----------------------------------------
1. PARADIGM SHIFT: Move from read-only data mapping to active omni-channel messaging (SMS/Email) driven directly by database state changes.
2. WEBHOOK LOOP PREVENTION: Implement a sync-token registry on the database. When UnifData updates an external API (like QuickBooks), generate a random cryptographic token, save it to the customer record, and use it to drop echo webhooks instantly so we don't cause infinite update loops.
3. FAIL-SAFE DESIGN: Build an automated historical audit ledger for every data mutation to protect against accidental cascading deletes. Enable pg_trgm for fast fuzzy-searching in the messaging inbox, and set up an explicit Dead Letter Queue (DLQ) pattern for background automation.

-----------------------------------------
PART 2: IMPLEMENTATION MODULES
-----------------------------------------

MODULE 1: MASTER SCHEMA & PRECEDENCE MERGING
- Create an ORM migration establishing 'master_customers' and 'master_customer_audit_logs'.
- Tables must map organization_id, personal identifiers, and external IDs (quickbooks_customer_id, jobber_client_id, hubspot_contact_id).
- Performance: Enable 'pg_trgm'. Create GIN indexes on first_name, last_name, and primary_email.
- Automation: Write a PL/pgSQL database trigger that catches all INSERT, UPDATE, and DELETE actions on master_customers and logs before/after states atomically into master_customer_audit_logs.
- Conflict Resolution Logic: QuickBooks data completely overrides billing/financial fields. Jobber overrides operational/service fields. Most recent timestamp overrides communication/identity fields.

MODULE 2: OMNICHANNEL INBOX & SECURE WEBHOOKS
- Webhook Hardening: Create an HMAC signature validation middleware for incoming routes (/api/webhooks/*) to prevent spoofed payloads from third parties.
- DB Log: Append a 'communications_log' table referencing master_customers to log inbound/outbound SMS (Twilio) and Email (Mailgun/SendGrid).
- Stream: Broadcast real-time messaging updates via our existing WebSocket/Event architecture.

MODULE 3: RESILIENT AUTOMATION QUEUES (BULLMQ)
- Engine: If not present, initialize BullMQ and Redis. 
- Retry Strategy: Force 5 max attempts utilizing exponential backoff (starting at 5000ms). Retain failed items in queue for manual Dead Letter Queue management.
- Recipe 1: Overdue Invoice Remediation (QuickBooks Event) -> Wait 24 hours -> Check if still unpaid -> Extract customer metadata -> Dispatch text with deep-link checkout URL.
- Recipe 2: Lost Quote Reactivation (Jobber Event) -> Trigger multi-tiered drip sequence (Email 1 on Day 7, Email 2 on Day 14).

MODULE 4: MULTI-TENANT ISOLATION
- Security: Enable PostgreSQL Row-Level Security (RLS) on master_customers using organization_id = current_setting('app.current_organization_id').
- White-Label: Build router middleware that extracts the inbound hostname, matches it to tenant branding metadata, and dynamically swaps out styling configurations.

-----------------------------------------
YOUR NEXT STEPS (CLAUDE CODE)
-----------------------------------------
1. Index this current repository directory.
2. Locate our existing database models, migrations folder, server routes, and queue environments.
3. Reply with a confirmation that you understand the blueprint, and list out the EXACT files in our repository that will be modified when we begin implementing Module 1. Do not modify or write any code until I give the command.
