# FrontierOps

FrontierOps is a cloud-based CRM and business dashboard for local service businesses.

## Features

- User signup and login
- Company workspace setup
- Customer database
- Lead tracker
- Job tracker
- Sales tracker
- Follow-up reminders
- Real dashboard metrics
- Customer CSV import
- AI business summaries

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- Supabase Auth
- Supabase Row Level Security
- Gemini API

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
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Main Routes

```text
/              Public landing page
/preview       Public Product preview
/signup        Signup page
/login         Login page
/onboarding    Company setup
/workspace     Private real dashboard
/customers     Customer database
/leads         Lead tracker
/jobs          Job tracker
/sales         Sales tracker
/follow-ups    Follow-up reminders
/imports       Customer import
/ai-assistant  AI business summary
```

## Database Files

```text
database/001_initial_schema.sql
database/002_rls_policies.sql
```

## Security Notes

- `.env.local` should never be committed.
- Company data is separated using `company_id`.
- Supabase Row Level Security protects company records.
- AI summaries should use business metrics, not sensitive customer details.
