# ===================================================================
STRATEGIC RE-POSITIONING & BUSINESS DIRECTION: UNIFDATA OS (v3.1)

Hey Claude, we are officially shifting UnifData from a passive analytics dashboard into an active, high-yield Customer Operating System (OS).

Our engineering focus is no longer just about calculating "Data Health" scores or showing read-only metrics. Moving forward, the technical goal of this platform is to act as an automated revenue-recovery engine and an operational system of record directly for local service businesses.

We are embracing a "Value-First, Autopilot-Revenue" model. Every architectural piece we build must be optimized to achieve two clear commercial outcomes:

1. Maximize Recovered Revenue: Automatically hunting down unpaid invoices and ghosted quotes via background queues, making the app's ROI undeniably clear to the user.
2. Build Local Trust: Implementing enterprise-grade security (HMAC validation, Audit logging, Row-Level Security) so users confidently trust us to handle their live customer communications and financial data states.

*NOTE ON BUSINESS SCOPE:* We are completely skipping any agency/white-label distribution models. We are not building custom domain mapping, dynamic host-header middleware, or white-label branding overrides. The application remains strictly branded as UnifData, serving local service businesses directly.

OUR NEW TECHNICAL NORTH STAR:
Every feature, database query, and automation workflow you design must be resilient, secure, and focused on reducing administrative friction while actively generating or recovering cash for our users.

Confirm that you understand this strategic shift in our business model. Read the updated, comprehensive technical specification below, index our workspace, and map out the exact implementation files before modifying or writing any code.

# ===================================================================
UNIFDATA SYSTEM UPGRADE SPECIFICATION (v3.1 - D2C AUTOPILOT EDITION)

---

## PART 1: STRATEGIC CONTEXT & ARCHITECTURAL PHILOSOPHY

1. THE CORE PARADIGM SHIFT
UnifData’s current market value lies in its ability to aggregate disparate, messy local business data (QuickBooks, Jobber, HubSpot, spreadsheets) into a unified "Data Health" dashboard and a centralized "Today's Brief". However, it currently acts as a passive observer. The user identifies data gaps or revenue opportunities but must leave UnifData to resolve them via external applications.

This upgrade moves the application from Passive Observability to Active Execution. By embedding omni-channel communication engines directly into the data layer, the platform transforms from an administrative utility into a core revenue driver sold directly to local service businesses.

2. WORKSPACE INTEGRATION & ARCHITECTURE BLUEPRINT
Because this specification is designed for execution via Claude Code (with direct workspace repository access), Claude must first cross-reference all proposed database schemas, routes, and background models with the existing repository architecture before creating files or executing migrations.

```
┌────────────────────────┐      ┌───────────────────────────┐      ┌────────────────────────┐
│   QuickBooks API       │      │        Jobber API         │      │      HubSpot API       │
└──────────┬─────────────┘      └─────────────┬─────────────┘      └───────────┬────────────┘
           │ Inbound HMAC Webhooks            │                                │
           ▼                                  ▼                                ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│     Existing Router Loop & Ingestion Pipeline / HMAC Signature Validation Middleware       │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                    Conflict Resolution Layer (Precedence-Based Engine)                     │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│               Global Master Customer Database (with Trigram Searching & CDC)              │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│              Asynchronous Outbound Queue & Dead Letter Queue (BullMQ / Redis)             │
└───┬──────────────────────────────────┬──────────────────────────────────┬─────────────────┘
    │                                  │                                  │
    ▼ Outbound Sync                    ▼ Messaging API                    ▼ Automation Engine
┌────────────────────────┐      ┌───────────────────────────┐      ┌────────────────────────┐
│ External App Updates   │      │ Twilio / Mailgun Carriers │      │ Event-Driven Pipelines │
└────────────────────────┘      └───────────────────────────┘      └────────────────────────┘

```

> **Claude Code Workspace Guardrail:** When transitioning from read-only to bidirectional sync, Claude Code must match the existing project's ORM and database connection architecture. A sync-token registry must be implemented on the active database cluster to drop echo loops instantly.

---

## PART 2: REPOSITORY TARGET EXECUTION MODULES

MODULE 1: MASTER SCHEMA, DEEP TRIGRAM INDEXING, & PRECEDENCE MERGING

1. Database Schema Extensions
Design and deploy an ORM-compliant database migration establishing the unified customer entity, enabling fuzzy search capabilities via the `pg_trgm` extension, and setting up an automated historical audit ledger.

```sql
-- Enable PostgreSQL extensions for high-performance fuzzy searching
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE master_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    primary_email VARCHAR(255) UNIQUE,
    primary_phone VARCHAR(50) UNIQUE,
    billing_address JSONB,
    service_address JSONB,
    quickbooks_customer_id VARCHAR(255),
    jobber_client_id VARCHAR(255),
    hubspot_contact_id VARCHAR(255),
    data_health_score INT DEFAULT 100,
    metadata JSONB DEFAULT '{}'::jsonb,
    sync_tokens JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Ledger for Disaster Recovery & Change Data Capture
CREATE TABLE master_customer_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID,
    organization_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    before_state JSONB,
    after_state JSONB,
    changed_by VARCHAR(255) DEFAULT 'SYSTEM_SYNC',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes (B-Tree for lookups, GIN for fuzzy inbox searches)
CREATE INDEX idx_master_customers_org ON master_customers(organization_id);
CREATE INDEX idx_master_customers_qbo ON master_customers(quickbooks_customer_id);
CREATE INDEX idx_master_customers_jobber ON master_customers(jobber_client_id);
CREATE INDEX idx_master_cust_name_trgm ON master_customers USING gin (first_name gin_trgm_ops, last_name gin_trgm_ops);
CREATE INDEX idx_master_cust_email_trgm ON master_customers USING gin (primary_email gin_trgm_ops);

-- Database Trigger to enforce atomic Audit Logging automatically
CREATE OR REPLACE FUNCTION log_master_customer_mutation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO master_customer_audit_logs (customer_id, organization_id, action, before_state, after_state)
    VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.organization_id, OLD.organization_id),
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_master_customers
AFTER INSERT OR UPDATE OR DELETE ON master_customers
FOR EACH ROW EXECUTE FUNCTION log_master_customer_mutation();

```

2. Conflict Resolution & Loop Prevention Engine (`conflict_resolver.js`)
Implement a resolution utility module and inject it directly into the repo's existing ingestion pipelines.

* Precedence Hierarchy: QuickBooks data completely overrides financial/billing fields. Jobber overrides operational/service metrics. The latest updated timestamp wins on raw contact identity details (first name, last name, phone, email).
* Loop Prevention Engine: When pushing an outbound update to an external provider, write a short-lived random token to `sync_tokens`. Implement a interceptor hook inside the webhook endpoint handler that parses incoming messages and short-circuits execution ($< 10\text{ms}$) if the event token matches the local record state.

3. Claude Code Step-by-Step Prompts

* "Analyze the active workspace database configuration and locate the directory containing our existing database migrations. Generate a new migration file matching our ORM conventions that provisions the master_customers and master_customer_audit_logs tables along with the GIN trigram indexes and PL/pgSQL database triggers specified in Module 1."
* "Examine how our current read-only ingestion pipeline formats customer payloads from QuickBooks and Jobber. Create a conflict_resolver.js module in our utility folder that enforces our system-of-record precedence rules and export it for use in our webhook handlers."

---

MODULE 2: OMNICHANNEL INBOX, ROUTER AUDITING, & WEBHOOK HARDENING

1. Webhook Security & Forgery Protection Middleware
Locate the entry-point routes file or webhooks engine in the repo, then hook a custom verification middleware block to secure all endpoints prefixed with `/api/webhooks/*`.

```javascript
// Verification Middleware Blueprint
const crypto = require('crypto');

function validateTwilioSignature(req, res, next) {
    const twilioSignature = req.headers['x-twilio-signature'];
    const params = req.body;
    const url = process.env.WEBHOOK_URL + req.originalUrl;
    
    // Sort and sign parameters to ensure origin validity
    const expectedSignature = crypto
        .createHmac('sha1', process.env.TWILIO_AUTH_TOKEN)
        .update(Buffer.from(url + Object.keys(params).sort().reduce((acc, key) => acc + key + params[key], '')))
        .digest('base64');

    if (twilioSignature !== expectedSignature) {
        return res.status(401).send('Webhook Security Validation Failed: Unauthorized Signature Forgery.');
    }
    next();
}

```

2. Messaging Stream Storage & Real-Time Broadcasting
Append the following real-time data table to the database layer to map cross-channel message threads safely back to the newly unified customer files.

```sql
CREATE TABLE communications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES master_customers(id),
    direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
    channel VARCHAR(10) CHECK (channel IN ('sms', 'email')),
    payload TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'received',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

```

* Inbound Payload Stream: Parse incoming messages from Twilio (SMS) and Mailgun/SendGrid (Email). Normalize phone numbers to the E.164 standard before running a trigram search against `master_customers`.
* Real-Time Updates: Broadcast inbound updates dynamically to the UI using the application's existing WebSocket/Event architecture.

3. Claude Code Step-by-Step Prompts

* "Locate our web application routing file or Express/Fastify/Next.js route directory. Implement an HMAC security validation middleware layer for our incoming webhook routes to verify request signatures from Twilio, QuickBooks, and HubSpot before processing payloads."
* "Build an API router file for the Omnichannel Inbox. Include a POST /api/messages/send endpoint that writes to the communications_log database table, handles normalization of inbound E.164 phone formats, and broadcasts updates over our existing WebSocket architecture if present."

---

MODULE 3: DISTRIBUTED AUTOMATION ENGINE & RESILIENT QUEUES (BULLMQ)

1. Worker Environment Alignment
If no background worker engine exists, configure an asynchronous task cluster using Redis and BullMQ, utilizing an explicit exponential retry structure to avoid cascading third-party system time-outs.

```javascript
const queueOptions = {
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000, // Retries exponentially at 5s, 10s, 20s, 40s, 80s
    },
    removeOnComplete: true,
    removeOnFail: false // Kept in state for Dead Letter Queue review
  }
};

```

2. Native Event Task Recipes

* Overdue Invoice Remediation (QuickBooks Trigger): When a QuickBooks webhook flags an invoice as past due, drop a job onto the queue delayed by 24 hours. At execution time, poll the local database to verify if the payment status remains unpaid. If true, extract customer identifiers from `master_customers` and dispatch an automated SMS containing a direct-checkout payment link.
* Lost Quote Reactivation (Jobber Trigger): When a Jobber quote is marked as "Closed" or "Archived" without being converted to a job, trigger a multi-tiered background pipeline. On Day 7, send a structured seasonal promotion via email. On Day 14, if no conversion activity has been detected, follow up with an automated SMS text message checking in.

3. Claude Code Step-by-Step Prompts

* "Analyze our repository dependencies. If bullmq and redis are not initialized, install the dependencies and create a centralized configuration worker. Set up exponential backoff retries and ensure failed tasks are preserved as a Dead Letter Queue (DLQ)."
* "Write the automated task handlers for the Overdue Invoice Remediation and Lost Quote Reactivation workflows, linking them directly to our master database hooks."

---

MODULE 4: MULTI-TENANT ISOLATION (STANDARD OPERATING ENVIRONMENT)

1. Row-Level Security Enforcements
To protect standard direct-to-consumer accounts from cross-tenant data leaks, all database operations must strictly isolate queries to the authenticated organization's execution scope using PostgreSQL Row-Level Security (RLS).

```sql
ALTER TABLE master_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON master_customers 
    USING (organization_id = current_setting('app.current_organization_id'));

```

2. Claude Code Step-by-Step Prompts

* "Audit our database access abstraction layer. Refactor existing queries to set the app.current_organization_id variable context before execution, and generate a migration file applying the PostgreSQL Row-Level Security policy to the master_customers table."

---

## PART 3: WORKSPACE VERIFICATION & DEFINITION OF DONE (DoD)

Claude Code must run your project's local verification scripts to prove code health before wrapping up development:

1. Local Test Compliance: Run the repo's native test commands (`npm run test`, `pytest`, etc.) and ensure zero breaks on existing functionality.
2. Data Resiliency Test: Simulate 5,000 parallel webhook payloads against `conflict_resolver.js` and verify merge resolution finishes with $\ge 99.8\%$ tracking precision.
3. Loop Defense Validation: Test a simultaneous mutation block across identical records and ensure echo loops are safely caught and dropped under $< 10\text{ms}$.

# ===================================================================
YOUR NEXT STEPS (CLAUDE CODE)

1. Index this current repository directory.
2. Locate our existing database models, migrations folder, server routes, and queue environments.
3. Reply with a confirmation that you understand the blueprint and the direct-to-consumer business alignment.
4. List out the EXACT files in our repository that will be modified when we begin implementing Module 1. Do not modify or write any code until I give the explicit command.
