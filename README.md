# UnifData

UnifData is an industry-aware CRM and business operating system for local businesses. It adapts its language and structure to match your business type — field service, dental, insurance, professional services, retail, and more. Everything lives in one workspace: pipeline, customers, jobs, sales, follow-ups, imports, integrations, and an AI Advisor.

Live at [unifdata.com](https://unifdata.com).

---

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Clerk (auth + invite-only waitlist)
- Supabase (Postgres + Row Level Security)
- Stripe (embedded checkout)
- Gemini API (`@google/genai`, model: `gemini-2.5-flash`)
- Resend (transactional email)
- Vercel (hosting)

---

## Auth and Payment Flow

1. User joins the waitlist at unifdata.com
2. Admin sends an invite via Clerk
3. User clicks the invite link and creates an account
4. Stripe embedded checkout collects $300 setup + $100/mo subscription
5. On payment success, user is redirected to onboarding to configure their workspace

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
/onboarding            Workspace setup
/workspace             Today brief (AI-generated daily summary)
/crm                   Pipeline and relationship overview
/customers             Customer / relationship records
/leads                 Opportunities
/jobs                  Work and delivery records
/sales                 Revenue records
/follow-ups            Actions and reminders
/imports               CSV and Google Sheets import
/imports/sessions/[id] Import session review
/ai-assistant          AI Advisor chat
/data-hub              Record quality and health overview
/settings              Workspace and integration settings
```

---

## Local Setup

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in the values:

```bash
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
STRIPE_PRICE_ID=
STRIPE_PRICE_ID_SETUP=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
GEMINI_API_KEY=
RESEND_API_KEY=
CRON_SECRET=
LEAD_INGEST_SECRET=
```

See `.env.example` for optional integration variables (Google Sheets, QuickBooks, Square, HubSpot, Jobber, Stripe Connect).

Start the dev server:

```bash
npm run dev
# http://localhost:3000
```

Run a build check before committing major changes:

```bash
npm run build
```

---

## Key Features

- **Today Brief** — AI-generated daily workspace summary (pipeline health, unpaid revenue, overdue follow-ups)
- **Pipeline / CRM** — Opportunity tracking with lifecycle sync (accepted → job created → revenue tracked)
- **Customers** — Relationship records with industry-aware labels
- **Jobs** — Work and delivery tracking
- **Sales** — Revenue and payment status
- **Follow-ups** — Action and reminder tracking
- **Imports** — CSV and Google Sheets import with staged review (validate → resolve duplicates → commit)
- **Integrations** — Jobber, QuickBooks, HubSpot, Square
- **AI Advisor** — Plain-language chat over live workspace data
- **Data Hub** — Record quality checks and health overview

---

## Security

- `.env.local` is never committed
- Company data is isolated by `company_id`
- Supabase Row Level Security enforces per-company data access
- Google Sheets integration is read-only and requires explicit sheet selection
- Integrations are read-only first before any write access is considered
