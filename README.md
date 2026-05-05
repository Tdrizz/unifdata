# FrontierOps

FrontierOps is an industry-aware business operating system for local companies.

It helps businesses organize relationships, opportunities, work, revenue, actions, imports, and AI summaries into one clean workspace.

The core business flow is:

```text
Relationships → Opportunities → Work → Revenue → Actions
```

FrontierOps is designed to adapt to different business types. A landscaping company may see clients, quotes, service visits, and payments. A dental office may see patients, treatment opportunities, appointments, and collections. An insurance agency may see clients, policy opportunities, policy tasks, and commission records.

## Live Product

```text
https://frontierops.vercel.app
```

## Current Features

- User signup and login
- Company workspace setup
- Industry-aware labels and dashboard language
- Public landing page
- Public product preview page
- Public documentation page
- Privacy policy and terms of service pages
- Today operating brief
- Pipeline and relationship overview
- Data Hub with record quality checks
- People / relationship records
- Opportunity records
- Work / delivery records
- Revenue records
- Action / follow-up records
- CSV customer import with staged review flow
- Google Sheets import (OAuth connect, picker, row review, commit)
- Import session review: validate rows, resolve duplicates, fix errors before committing
- AI operating brief (Gemini-generated summary of live workspace data)
- AI chat: ask questions about your customers, pipeline, revenue, and follow-ups
- Workspace settings: business profile, industry, brand colors, connected tools
- Opportunity lifecycle sync:
  - Accepted opportunities create linked work records
  - Accepted opportunities create expected revenue records
  - Payment status stays separate until money is collected

## Product Pages

```text
/              Public landing page
/preview       Product preview
/docs          Public documentation
/privacy       Privacy policy
/terms         Terms of service
/signup        Signup page
/login         Login page
/onboarding    Company setup
/workspace     Today operating brief
/crm           Pipeline and relationship overview
/data-hub      Data quality and record health
/customers     People / relationship records
/leads         Opportunities
/jobs          Work / delivery
/sales         Revenue
/follow-ups    Actions and reminders
/imports       CSV and Google Sheets imports
/imports/sessions/[id]  Import session review
/ai-assistant  AI operating brief and chat
/settings      Workspace settings
```

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres
- Supabase Auth
- Supabase Row Level Security
- Gemini API (`@google/genai`, model: `gemini-2.5-flash`)
- Zod
- Vercel

## Local Setup

Install dependencies:

```bash
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
GEMINI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Only one Gemini key is required — `GEMINI_API_KEY` is checked first, then `GOOGLE_GENERATIVE_AI_API_KEY`. Google OAuth credentials are required for the Google Sheets integration.

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build locally:

```bash
npm run build
```

## Database Files

```text
database/001_initial_schema.sql
database/002_rls_policies.sql
database/003_company_industry_profiles.sql
database/004_import_sync_engine.sql
database/005_import_sessions.sql
database/006_consolidate_business_sectors.sql
```

Future database work should be added as numbered migrations.

## Core Product Model

FrontierOps uses a business lifecycle model:

### Relationships

People, customers, clients, patients, companies, or accounts the business works with.

### Opportunities

Potential business such as quotes, treatment plans, proposals, policy opportunities, inquiries, or deals.

### Work

The delivery layer: jobs, appointments, projects, service visits, orders, policy tasks, or deal tasks.

### Revenue

Money tied to the business flow: payments, invoices, collections, commissions, or sales.

### Actions

Follow-ups, reminders, callbacks, renewal tasks, patient actions, or next steps.

## Industry-Aware Language

FrontierOps keeps the same core lifecycle but changes the wording based on the company type.

Examples:

```text
Field Service:
Clients → Quotes → Service Visits → Payments → Client Actions

Dental / Medical:
Patients → Treatment Opportunities → Appointments → Collections → Patient Actions

Insurance:
Clients → Policy Opportunities → Policy Tasks → Commission Records → Renewal Actions

Automotive:
Customers → Vehicle Opportunities → Deal Tasks → Vehicle Sales → Customer Actions

Professional Services:
Clients → Proposals → Projects → Invoices → Client Actions

Retail:
Customers → Inquiries → Orders → Sales → Customer Actions
```

## Opportunity Lifecycle Sync

When an opportunity is marked accepted or won, FrontierOps can create the connected downstream records.

```text
Opportunity accepted → Work created → Revenue tracked as unpaid
```

Payment status remains separate. Accepted business does not automatically mean money has been collected.

This keeps the business flow connected while still allowing the company to update payment status later.

## Import Engine

The import engine stages all data for review before writing to the workspace.

### How it works

```text
1. Upload CSV or connect Google Sheets
2. FrontierOps analyzes rows and classifies them as valid, duplicate, or error
3. Review session: fix errors, decide on duplicates, confirm valid rows
4. Commit: clean records are written to the workspace
5. Run history is saved for reference
```

### Import session statuses

```text
draft      → uploading / processing
analyzing  → row classification running
ready      → rows classified, waiting for user review
failed     → something went wrong during analysis
committed  → user confirmed and records were written
cancelled  → session was abandoned
```

### Google Sheets integration

Connect a Google account from the Import page. FrontierOps uses OAuth and the Google Picker API — it only reads sheets the user explicitly selects. Once connected, sheets can be imported the same way as CSV files.

### Sync phases

```text
Phase 1: CSV mapping — done
Phase 2: Google Sheets read-only import — done
Phase 3: Scheduled sync runs
Phase 4: QuickBooks / payments read-only sync
Phase 5: Industry-specific integrations
Phase 6: Carefully scoped two-way sync
```

The product should avoid becoming just another manual CRM. The long-term value is helping businesses connect scattered tools, clean up messy data, and see what needs attention.

## AI Features

### Operating brief

Gemini reads live workspace data and generates a short practical brief covering pipeline health, unpaid revenue, overdue follow-ups, and recommended next steps. Briefs are saved and can be regenerated at any time.

### AI chat

Ask plain-language questions about the workspace. Gemini has access to the same live data as the brief and answers using the correct terminology for the business type. Conversation history is kept for multi-turn questions within a session.

## Security Notes

- `.env.local` should never be committed.
- Company data is separated using `company_id`.
- Supabase Row Level Security protects company records.
- AI summaries focus on business activity and avoid unnecessary sensitive customer details.
- Google Sheets integration is read-only and requires explicit sheet selection by the user.
- Sync integrations should start read-only before any two-way sync is considered.

## Current Status

FrontierOps is live as an early MVP.

The current focus is:

```text
1. Validate the product with real business owners
2. Improve imports and data migration
3. Build scheduled sync runs (Phase 3)
4. Add cleaner company settings
5. Improve industry-specific dashboards
6. Turn repeated manual setup work into product features
```

## Development Notes

Run a local build before committing major changes:

```bash
npm run build
```

Commit changes:

```bash
git add .
git commit -m "Your commit message"
git push
```
