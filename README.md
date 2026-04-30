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
- Today operating brief
- Pipeline and relationship overview
- Data Hub with record quality checks
- People / relationship records
- Opportunity records
- Work / delivery records
- Revenue records
- Action / follow-up records
- CSV customer import
- AI business summaries
- Opportunity lifecycle sync:
  - Accepted opportunities create linked work records
  - Accepted opportunities create expected revenue records
  - Payment status stays separate until money is collected

## Product Pages

```text
/              Public landing page
/preview       Product preview
/docs          Public documentation
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
/imports       CSV imports
/ai-assistant  AI business summary
```

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres
- Supabase Auth
- Supabase Row Level Security
- Gemini API
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
```

Only one Gemini key is required, but the app supports both environment variable names.

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

## Import and Sync Direction

FrontierOps is moving toward an import and sync engine.

The goal is to let businesses connect or import data from their current systems, then use FrontierOps as the operating layer above those tools.

Planned sync direction:

```text
Phase 1: Better CSV mapping
Phase 2: Google Sheets read-only sync
Phase 3: Scheduled sync runs
Phase 4: QuickBooks / payments read-only sync
Phase 5: Industry-specific integrations
Phase 6: Carefully scoped two-way sync
```

The product should avoid becoming just another manual CRM. The long-term value is helping businesses connect scattered tools, clean up messy data, and see what needs attention.

## Security Notes

- `.env.local` should never be committed.
- Company data is separated using `company_id`.
- Supabase Row Level Security protects company records.
- AI summaries should focus on business activity and avoid unnecessary sensitive customer details.
- Sync integrations should start read-only before any two-way sync is considered.

## Current Status

FrontierOps is live as an early MVP.

The current focus is:

```text
1. Validate the product with real business owners
2. Improve imports and data migration
3. Build the import and sync engine
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
