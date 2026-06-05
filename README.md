# UnifData

UnifData is an industry-aware CRM and autonomous business operating system for local service businesses. It adapts its language and structure to match your business type — field service, dental, insurance, professional services, retail, and more. Everything lives in one workspace: pipeline, customers, jobs, sales, follow-ups, imports, integrations, an AI Advisor, and a nightly agent pipeline that surfaces outreach drafts and revenue alerts automatically.

Live at [unifdata.com](https://unifdata.com).

---

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Clerk (auth + invite-only waitlist)
- Supabase (Postgres + Row Level Security)
- Stripe (embedded checkout)
- OpenRouter (AI routing — Claude 3.5 Haiku for chat, Claude 3.5 Sonnet for outreach, GPT-4o-mini for revenue/alerts, Gemini Flash for data quality, Hermes-3-70B for orchestration)
- BullMQ + Upstash Redis (background job queue)
- Twilio (outbound SMS)
- Sentry (error monitoring)
- Mailgun (outbound email)
- Vercel (hosting + cron jobs)

---

## Auth and Payment Flow

1. User joins the waitlist at unifdata.com
2. Admin sends an invite via Clerk
3. User clicks the invite link and creates an account
4. Stripe embedded checkout collects $300 setup + $100/mo subscription
5. On payment success, user is redirected to the 5-step onboarding wizard

---

## Routes

### Public

```
/              Landing page
/preview       Product preview
/docs          Documentation
/privacy       Privacy policy
/terms         Terms of service
/sign-in       Clerk sign-in
/sign-up       Clerk sign-up (invite-only)
```

### App (requires auth + active subscription)

```
/onboarding            5-step setup wizard (business → contacts → job → follow-up → Operating Brief)
/workspace             Dashboard with Agent Inbox, Operating Brief, and KPIs
/crm                   Pipeline and relationship overview
/customers             Customer / relationship records
/leads                 Opportunities
/jobs                  Work and delivery records
/sales                 Revenue records
/follow-ups            Actions and reminders
/imports               CSV and Google Sheets import with staged review
/imports/sessions/[id] Import session review
/ai-assistant          AI Advisor chat (persistent history, tool calling)
/data-hub              Record quality, health scoring, and deduplication
/contacts              Contact records (master_customers — unified view)
/communications        SMS thread inbox
/automations           Automation rule builder (early access)
/process               Custom process board (drag-and-drop kanban)
/settings              Workspace and integration settings (autopilot toggle)
```

### Internal / Cron

```
GET /api/cron/automation      Nightly agent pipeline (6:00 AM UTC daily)
GET /api/cron/sync            Integration sync (3:00 AM UTC daily)
GET /api/cron/weekly-summary  Weekly email summary (8:00 AM UTC Mondays)
POST /api/ai/chat             Streaming AI chat with tool calling
POST /api/ai/business-summary Generate Operating Brief
POST /api/v1/agent-drafts/[id]/approve   Approve + send outreach draft
POST /api/v1/agent-drafts/[id]/dismiss   Dismiss draft
POST /api/v1/agent-alerts/[id]/dismiss   Dismiss alert
```

---

## Key Features

- **5-Step Onboarding Wizard** — Business info → import contacts (manual or CSV with column mapping) → first job → first follow-up → auto-generate Operating Brief. No redirect between steps; stays on the same page.
- **Operating Brief** — AI-generated daily workspace summary (pipeline health, unpaid revenue, overdue follow-ups, data gaps)
- **AI Advisor** — Plain-language chat over live workspace data with tool calling (create follow-ups, update job status, add customers). Persistent history across navigation. Rate-limited per tier.
- **Nightly Agent Pipeline** — BullMQ cron at 6 AM UTC runs a manager agent (Hermes-3) that reads telemetry signals and dispatches three workers:
  - **Outreach worker** — drafts follow-up emails/SMS for stale customers
  - **Revenue worker** — surfaces revenue drops and unpaid invoice alerts
  - **Alert formatter** — formats operational signals into inbox cards
- **Agent Inbox** — Pending drafts and alerts displayed on the workspace dashboard. Each item includes AI reasoning ("No contact in 47 days and $1,200 unpaid invoice"). Pro tier only.
- **Co-Pilot / Autopilot modes** — Co-Pilot: outreach drafts queue for your approval before sending. Autopilot: emails and SMS fire automatically via Mailgun/Twilio.
- **ROI Counter** — Tracks recovered revenue from approved outreach actions.
- **Pipeline / CRM** — Opportunity tracking with lifecycle sync (accepted → job created → revenue tracked)
- **Imports** — CSV and Google Sheets import with staged review (validate → resolve duplicates → commit)
- **Integrations** — Jobber, QuickBooks, HubSpot, Square
- **Data Hub** — Record quality, health scoring, and automatic background deduplication
- **Contacts** — Unified contact view built on master_customers. Synced from all write paths (manual entry, onboarding wizard, CSV import, AI assistant, integrations). Includes activity timeline, notes, linked jobs/sales/follow-ups, and tag/segment filtering.
- **Communications** — SMS thread inbox. Inbound messages routed via Twilio webhook to matched contacts. Outbound replies sent via Twilio.
- **Process Board** — Custom drag-and-drop kanban board for tracking any business process. Configurable stages, record values, and contact linking. Boards are created and managed in Settings.

---

## Tier Gates

| Feature | Standard | Pro |
|---------|----------|-----|
| AI Advisor chat | 5 req/day | 20 req/day |
| Agent Inbox | Upgrade prompt | Full access |
| Nightly agent pipeline | — | ✓ |
| Autopilot mode | — | ✓ |
| ROI counter | — | ✓ |

AI features are blocked entirely for companies with `business_sector = "medical"` (no BAA in place). A 403 is returned with an explanation.

---

## Local Setup

```bash
npm install
cp .env.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENROUTER_API_KEY=
REDIS_URL=rediss://default:<token>@<host>:6379   # Upstash ioredis URL
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
CRON_SECRET=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

See `.env.example` for optional integration variables (Google Sheets, QuickBooks, Square, HubSpot, Jobber, Stripe Connect).

> **Local Redis note:** `REDIS_URL=redis://localhost:6379` works for local dev if you have Redis running. For Vercel/production, use the Upstash `rediss://` URL. BullMQ cron jobs require a live Redis connection.

Start the dev server:

```bash
npm run dev
# http://localhost:3000
```

Run a build check before committing:

```bash
npm run build
```

---

## Agent Pipeline Architecture

```
Vercel Cron (6 AM UTC)
  └─ GET /api/cron/automation
       └─ Queue: nightly-coordinator job per Pro org (BullMQ → Upstash)
            └─ runNightlyCoordinator(orgId)
                 ├─ compileTelemetry()           ← reads live Supabase tables
                 ├─ runManagerAgent()            ← Hermes-3-70B decides which workers to run
                 ├─ runOutreachWorker()          ← Claude 3.5 Sonnet drafts outreach
                 ├─ runRevenueWorker()           ← GPT-4o-mini surfaces revenue alerts
                 └─ runAlertFormatterWorker()    ← GPT-4o-mini formats operational alerts
                      └─ writes to agent_drafts / agent_alerts (with reasoning column)
                           └─ Agent Inbox on /workspace
```

Telemetry signals checked each night:
1. Overdue follow-ups ≥ 7 days
2. Revenue this week vs 4-week rolling average
3. Stale jobs not updated in ≥ 10 days
4. New customers in last 7 days with no follow-up logged
5. Unpaid invoices ≥ 30 days old
6. Pending data reconciliation proposals

---

## Security

- `.env.local` is never committed
- Company data is isolated by `company_id` / `organization_id`
- Supabase Row Level Security enforces per-company data access
- PII reduction: full customer names, emails, and phone numbers are never sent to OpenRouter. Names are truncated to first name + last initial; contact details are sent as booleans only (`hasPhone`, `hasEmail`)
- Medical sector gate: `isAiAllowed()` blocks all AI features for `business_sector = "medical"` (no BAA)
- Cron endpoints require `Authorization: Bearer <CRON_SECRET>` — Vercel injects this automatically on scheduled invocations
- Google Sheets integration is read-only
- Error monitoring: Sentry captures runtime exceptions with PII scrubbed before transmission (request bodies, query strings, auth headers, and user identity are stripped from all events)
