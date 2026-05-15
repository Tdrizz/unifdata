import type { Metadata } from "next";
import Link from "next/link";
import { ProductMark } from "@/components/ProductMark";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "UnifData documentation for setup, core concepts, workflows, and product preview guidance.",
};

const lifecycle = [
  {
    title: "Relationships",
    description:
      "People, customers, clients, patients, companies, or accounts the business works with.",
    examples: "Customers · Clients · Patients · Accounts",
  },
  {
    title: "Opportunities",
    description:
      "Potential business such as quotes, treatment plans, proposals, policy opportunities, inquiries, or deals.",
    examples: "Quotes · Proposals · Inquiries · Deals",
  },
  {
    title: "Work",
    description:
      "The delivery layer: jobs, appointments, projects, service visits, orders, policy tasks, or deal tasks.",
    examples: "Jobs · Appointments · Projects · Service visits",
  },
  {
    title: "Revenue",
    description:
      "Money tied to the business flow: payments, invoices, collections, commissions, or sales.",
    examples: "Payments · Invoices · Commissions · Sales",
  },
  {
    title: "Actions",
    description:
      "Follow-ups, reminders, callbacks, renewal tasks, patient actions, or next steps.",
    examples: "Follow-ups · Reminders · Callbacks · Renewals",
  },
];

const pages = [
  {
    name: "Today",
    path: "/workspace",
    tag: "Dashboard",
    description:
      "The daily operating brief. Shows follow-ups that are due, open opportunities, active work, unpaid revenue, and a data health score. Start here every morning.",
  },
  {
    name: "Pipeline",
    path: "/crm",
    tag: "Overview",
    description:
      "Relationship and opportunity view. See where business is sitting across the full lifecycle and identify what needs a follow-up or next action.",
  },
  {
    name: "Data Hub",
    path: "/data-hub",
    tag: "Health",
    description:
      "Business data command center. Tracks record completeness, flags missing fields, lists recent imports, and shows recent activity across the workspace.",
  },
  {
    name: "People",
    path: "/customers",
    tag: "Records",
    description:
      "Stores all relationship records — customers, clients, patients, accounts, or companies depending on the business sector.",
  },
  {
    name: "Opportunities",
    path: "/leads",
    tag: "Records",
    description:
      "Tracks potential business with status, source, estimated value, follow-up dates, and links to connected work and revenue records.",
  },
  {
    name: "Work",
    path: "/jobs",
    tag: "Records",
    description:
      "Tracks delivery and fulfillment records: jobs, appointments, projects, service visits, or orders. Links back to the opportunity and customer.",
  },
  {
    name: "Revenue",
    path: "/sales",
    tag: "Records",
    description:
      "Tracks all revenue records with amount, payment status, sale date, service type, and source. Separate from work status so unpaid records stay visible.",
  },
  {
    name: "Actions",
    path: "/follow-ups",
    tag: "Records",
    description:
      "Tracks reminders, follow-ups, callbacks, and overdue tasks. Completed actions are logged so there is a record of what was done and when.",
  },
  {
    name: "Imports",
    path: "/imports",
    tag: "Tools",
    description:
      "Import customer lists from CSV or connected integrations. Records are validated, created, and logged as an import batch so you can track what came in and when.",
  },
  {
    name: "Integrations",
    path: "/settings",
    tag: "Tools",
    description:
      "Connect Jobber, QuickBooks, HubSpot, Square, and Google Sheets to pull records into the workspace. Manage connection status and re-sync from Settings.",
  },
  {
    name: "AI Advisor",
    path: "/ai-assistant",
    tag: "Tools",
    description:
      "Generates a plain-English business brief from live workspace data. Surfaces what needs attention, what is performing well, and recommended next actions.",
  },
];

const sectors = [
  {
    sector: "General Business",
    wording:
      "Relationships, opportunities, work items, revenue records, and actions.",
  },
  {
    sector: "Medical / Dental / Healthcare",
    wording:
      "Patients, treatment opportunities, appointments, collections, and patient actions.",
  },
  {
    sector: "Construction / Contractor",
    wording:
      "Customers, estimates, projects, payments, and project actions.",
  },
  {
    sector: "Home & Field Services",
    wording: "Clients, quotes, service visits, payments, and client actions.",
  },
  {
    sector: "Professional Services",
    wording: "Clients, proposals, projects, invoices, and client actions.",
  },
];

const csvColumns = [
  {
    column: "name",
    required: true,
    description: "Full name of the customer or contact.",
    example: "Mike Johnson",
  },
  {
    column: "phone",
    required: false,
    description: "Phone number in any format.",
    example: "808-555-0110",
  },
  {
    column: "email",
    required: false,
    description: "Email address for the contact.",
    example: "mike@example.com",
  },
  {
    column: "address",
    required: false,
    description: "Street address, city, or service location.",
    example: "Kailua-Kona HI",
  },
  {
    column: "customer_type",
    required: false,
    description: "A label for the relationship type.",
    example: "Residential",
  },
  {
    column: "notes",
    required: false,
    description: "Any freeform notes about the customer.",
    example: "Interested in monthly service",
  },
];

const integrations = [
  {
    name: "Jobber",
    description:
      "Pull customers, jobs, and invoices from Jobber into UnifData. Keeps field service records in sync without manual re-entry.",
    path: "/settings",
    status: "Available",
  },
  {
    name: "QuickBooks",
    description:
      "Sync revenue records and payment status from QuickBooks. Matches payments to open revenue records so unpaid work stays accurate.",
    path: "/settings",
    status: "Available",
  },
  {
    name: "HubSpot",
    description:
      "Import contacts and deal data from HubSpot. Useful for businesses moving from a sales-focused CRM into an operations-focused workspace.",
    path: "/settings",
    status: "Available",
  },
  {
    name: "Square",
    description:
      "Connect Square to pull payment records directly into the revenue layer. Reduces manual entry for businesses using Square at point of sale.",
    path: "/settings",
    status: "Available",
  },
  {
    name: "Google Sheets",
    description:
      "Import data from a Google Sheet — customers, leads, or revenue records. A good bridge for businesses still running on spreadsheets.",
    path: "/settings",
    status: "Available",
  },
];

const navItems = [
  ["Getting started", "#start"],
  ["Overview", "#overview"],
  ["Core lifecycle", "#lifecycle"],
  ["Product pages", "#pages"],
  ["Industry language", "#industries"],
  ["Connected workflow", "#sync"],
  ["Integrations", "#integrations"],
  ["Imports", "#imports"],
  ["AI Advisor", "#ai"],
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#eef2f7] text-slate-950">
      <section className="mx-auto max-w-7xl px-6 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/">
            <ProductMark />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Home
            </Link>
            <Link
              href="/preview"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Preview
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Get started
            </Link>
          </div>
        </nav>

        <header className="mt-12 rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            UnifData Docs
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            Documentation for the business operating system.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            UnifData helps local businesses organize relationships,
            opportunities, work, revenue, actions, imports, and AI summaries
            into one industry-aware workspace.
          </p>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-4xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <p className="text-sm font-semibold text-slate-950">Contents</p>
            <div className="mt-4 grid gap-1 text-sm">
              {navItems.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                >
                  {label}
                </a>
              ))}
            </div>
          </aside>

          <div className="space-y-6">
            {/* GETTING STARTED */}
            <section
              id="start"
              className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Quick start
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Getting started
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                UnifData is built around a single company workspace. Every
                record — customers, leads, jobs, sales, and follow-ups — belongs
                to a company. Create a workspace, choose the business sector,
                and start adding records.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  {
                    step: "01",
                    title: "Create a workspace",
                    body: "Sign up and complete onboarding. Choose the business sector that matches the company — the workspace will adapt its language and priorities accordingly.",
                  },
                  {
                    step: "02",
                    title: "Import or add records",
                    body: "Bring in existing customers via CSV import, or add them manually. Then add leads, jobs, sales, and follow-ups to start building the operating picture.",
                  },
                  {
                    step: "03",
                    title: "Work from the Today page",
                    body: "The /workspace page shows what needs attention today — overdue follow-ups, open quotes, unpaid work, and data quality issues.",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <p className="text-xs font-semibold tracking-widest text-slate-400">
                      {item.step}
                    </p>
                    <p className="mt-3 font-semibold text-slate-950">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-[#d4dba8] bg-[#f2f5e7] p-5">
                <p className="text-sm font-semibold text-[#3d4f17]">
                  Tip: Start with your customer list
                </p>
                <p className="mt-1 text-sm leading-6 text-[#4a5e1c]">
                  Importing customers first means leads, jobs, sales, and
                  follow-ups can be linked to real records from the start. A CSV
                  with just name, phone, and email is enough to get going.
                </p>
              </div>
            </section>

            {/* OVERVIEW */}
            <section
              id="overview"
              className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                Overview
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                UnifData is built for businesses that have important
                information scattered across spreadsheets, QuickBooks, old CRMs,
                texts, inboxes, and memory. The goal is to give business owners
                one clear place to see what needs attention, what work is
                active, what money is unpaid, and what data needs cleanup.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Organize business activity",
                    description:
                      "Customers, leads, jobs, sales, and follow-ups all live in one place and connect to each other.",
                  },
                  {
                    title: "Adapt to the business type",
                    description:
                      "Language, labels, and priorities shift based on the company's industry and operating model.",
                  },
                  {
                    title: "Turn updates into connected workflow",
                    description:
                      "Marking an opportunity won automatically creates the linked work and revenue records.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* LIFECYCLE */}
            <section
              id="lifecycle"
              className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                Core lifecycle
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                UnifData organizes every business around five layers. The
                labels change based on the company sector, but the structure
                stays the same across all industries.
              </p>

              <div className="mt-6 grid gap-3">
                {lifecycle.map((item, index) => (
                  <div
                    key={item.title}
                    className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-[64px_1fr_auto]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                    </div>
                    <p className="text-xs font-medium text-slate-400 md:text-right">
                      {item.examples}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* PRODUCT PAGES */}
            <section
              id="pages"
              className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                Product pages
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Each page in UnifData covers a specific part of the business
                operating layer. Pages are accessible from the main navigation
                after logging in.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {pages.map((page) => (
                  <div
                    key={page.path}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">
                        {page.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {page.tag}
                        </span>
                        <code className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 border border-slate-200">
                          {page.path}
                        </code>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {page.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* INDUSTRY LANGUAGE */}
            <section
              id="industries"
              className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                Industry-aware language
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                The same five-layer lifecycle powers every workspace. What
                changes is the language. A dental office should see
                &quot;Patients&quot; and &quot;Appointments&quot; — not
                &quot;Customers&quot; and &quot;Jobs.&quot; UnifData adapts
                the workspace labels and priorities to the company&apos;s
                operating model during onboarding.
              </p>

              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500 md:grid-cols-[200px_1fr]">
                  <span>Sector</span>
                  <span>Workspace language</span>
                </div>
                {sectors.map((item, i) => (
                  <div
                    key={item.sector}
                    className={`grid gap-3 px-5 py-4 md:grid-cols-[200px_1fr] ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                  >
                    <p className="font-semibold text-slate-950">
                      {item.sector}
                    </p>
                    <p className="text-sm leading-6 text-slate-600">
                      {item.wording}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* CONNECTED WORKFLOW */}
            <section
              id="sync"
              className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                Connected workflow
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                When an opportunity is marked accepted or won, UnifData can
                create the connected work record and expected revenue record.
                Payment status stays separate, so accepted business does not
                automatically mean the money has been collected.
              </p>

              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
                <div className="grid divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
                  {[
                    {
                      step: "01",
                      label: "Opportunity accepted",
                      detail:
                        "Lead or quote is marked won or accepted by the business.",
                    },
                    {
                      step: "02",
                      label: "Work created",
                      detail:
                        "A linked job, appointment, or project record is generated automatically.",
                    },
                    {
                      step: "03",
                      label: "Revenue tracked as unpaid",
                      detail:
                        "A revenue record is created with payment status set to unpaid until collected.",
                    },
                  ].map((item) => (
                    <div key={item.step} className="p-6">
                      <p className="text-xs font-semibold tracking-widest text-slate-500">
                        {item.step}
                      </p>
                      <p className="mt-3 font-semibold text-white">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-amber-100 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-900">
                  Payment status is always separate
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Marking a job complete or an opportunity won does not mark the
                  revenue as paid. Payment status must be updated separately so
                  unpaid work stays visible on the Today page until the money is
                  actually collected.
                </p>
              </div>
            </section>

            {/* INTEGRATIONS */}
            <section
              id="integrations"
              className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                Integrations
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                UnifData connects to the tools local businesses already use.
                Integrations pull records into the workspace so you are not
                re-entering data from Jobber, QuickBooks, HubSpot, Square, or
                Google Sheets. Connect and manage integrations from{" "}
                <Link href="/settings" className="font-semibold text-slate-950 hover:underline">
                  Settings
                </Link>
                .
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {integrations.map((integration) => (
                  <div
                    key={integration.name}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">
                        {integration.name}
                      </p>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        {integration.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {integration.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-950 p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      step: "01",
                      label: "Connect in Settings",
                      detail: "Go to Settings and click Connect next to the integration you want to enable.",
                    },
                    {
                      step: "02",
                      label: "Authorize access",
                      detail: "Complete the OAuth flow for the connected service. UnifData only reads the data it needs.",
                    },
                    {
                      step: "03",
                      label: "Records sync in",
                      detail: "Customers, jobs, and revenue records are pulled into the workspace and linked to existing data where possible.",
                    },
                  ].map((item) => (
                    <div key={item.step}>
                      <p className="text-xs font-semibold tracking-widest text-slate-500">
                        {item.step}
                      </p>
                      <p className="mt-3 font-semibold text-white">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* IMPORTS */}
            <section
              id="imports"
              className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">Imports</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                The import flow supports customer CSV files. Each import is
                logged as a batch so you can track what was created and when.
                Records that already exist are not duplicated — the import
                creates new customer records only.
              </p>

              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                <div className="grid border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500 md:grid-cols-[140px_80px_1fr_160px]">
                  <span>Column</span>
                  <span>Required</span>
                  <span>Description</span>
                  <span>Example</span>
                </div>
                {csvColumns.map((col, i) => (
                  <div
                    key={col.column}
                    className={`grid gap-2 px-5 py-4 text-sm md:grid-cols-[140px_80px_1fr_160px] ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                  >
                    <code className="font-semibold text-slate-950">
                      {col.column}
                    </code>
                    <span>
                      {col.required ? (
                        <span className="rounded-full bg-slate-950 px-2 py-0.5 text-xs font-semibold text-white">
                          Required
                        </span>
                      ) : (
                        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">
                          Optional
                        </span>
                      )}
                    </span>
                    <span className="text-slate-600">{col.description}</span>
                    <code className="text-xs text-slate-400">
                      {col.example}
                    </code>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-700">
                Example CSV
              </p>
              <pre className="mt-2 overflow-x-auto rounded-3xl bg-slate-950 p-5 text-sm leading-7 text-slate-100">{`name,phone,email,address,customer_type,notes
Mike Johnson,808-555-0110,mike@example.com,Kailua-Kona HI,Residential,Interested in monthly service`}</pre>
            </section>

            {/* AI ADVISOR */}
            <section
              id="ai"
              className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                AI Advisor
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                The AI Advisor generates a plain-English business brief from the
                live data in the workspace. It reads the current state of
                customers, leads, jobs, sales, and follow-ups, then produces a
                structured summary with three sections: an overall snapshot,
                what needs attention, and recommended next actions.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Overall summary",
                    body: "A high-level read of where the business stands — revenue this month, active work, open pipeline, and customer count.",
                  },
                  {
                    title: "What needs attention",
                    body: "Flags overdue follow-ups, unpaid revenue, stale leads, and data quality issues that could cost the business money.",
                  },
                  {
                    title: "Recommended next actions",
                    body: "Three specific actions the business owner should take based on the current data — not generic advice.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-950 p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Example output
                </p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
                  <div>
                    <p className="font-semibold text-white">Overall summary</p>
                    <p className="mt-1">
                      Precision Landscape has 42 customers, 6 active jobs, and
                      $3,850 in unpaid work. Monthly revenue is $12,400 with
                      $18,200 in open quotes.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      What needs attention
                    </p>
                    <p className="mt-1">
                      4 follow-ups are overdue. 3 customer records are missing
                      contact details, which limits outreach. $3,850 in
                      completed work has not been marked paid.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      Recommended next actions
                    </p>
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li>
                        Follow up on the 4 overdue reminders before end of day.
                      </li>
                      <li>
                        Collect payment on the $3,850 in completed unpaid jobs.
                      </li>
                      <li>
                        Update the 3 incomplete customer records with phone or
                        email.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-[#d4dba8] bg-[#f2f5e7] p-5">
                <p className="text-sm font-semibold text-[#3d4f17]">
                  Get better results with more data
                </p>
                <p className="mt-1 text-sm leading-6 text-[#4a5e1c]">
                  The AI Advisor is most useful after the workspace has real
                  records. Add customers, leads, jobs, sales, and follow-ups
                  first. A workspace with only a few records will produce a
                  thinner summary.
                </p>
              </div>
            </section>

            {/* CTA */}
            <section className="rounded-4xl border border-slate-200 bg-slate-950 p-10 text-center text-white">
              <h2 className="text-2xl font-semibold tracking-tight">
                Ready to build the workspace?
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Create a company, pick the business sector, and start organizing
                the operating side of the business.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/signup"
                  className="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 hover:bg-slate-200"
                >
                  Create workspace
                </Link>
                <Link
                  href="/preview"
                  className="rounded-2xl border border-white/15 px-6 py-3 font-semibold text-white hover:bg-white/10"
                >
                  View preview
                </Link>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
