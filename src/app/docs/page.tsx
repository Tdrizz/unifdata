import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";

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
      "Business data command center. Tracks record completeness, flags missing fields, lists recent imports, and automatically reconciles incoming records — merging fuzzy matches and surfacing ambiguous cases for review.",
  },
  {
    name: "People",
    path: "/customers",
    tag: "Records",
    description:
      "Stores all relationship records — customers, clients, patients, accounts, or companies depending on the business sector.",
  },
  {
    name: "Contacts",
    path: "/customers",
    tag: "Records",
    description:
      "Unified contact view built on master customer records. Synced from every write path — manual entry, onboarding, CSV import, AI assistant, and integrations. Shows activity timeline, notes, linked jobs, sales, and follow-ups. Supports tag filtering and segment groups.",
  },
  {
    name: "Communications",
    path: "/communications",
    tag: "Tools",
    description:
      "SMS thread inbox. Inbound messages are routed via Twilio to matched contacts automatically. Replies are sent directly from the thread. Best managed on desktop.",
  },
  {
    name: "Process Board",
    path: "/process",
    tag: "Tools",
    description:
      "Custom drag-and-drop kanban board for tracking any internal business process. Stages, record values, and contact linking are fully configurable. Boards are created and managed in Settings.",
  },
  {
    name: "Automations",
    path: "/automations",
    tag: "Tools",
    description:
      "Rule builder for contact-based automations. Rules fire when a contact is created, changes status, gains a tag, goes inactive for N days, sends an inbound SMS, or when a process record is created or completed — adding tags, setting status, sending SMS, creating follow-ups or board records, or notifying the owner. Conditions scope each rule, and every run is logged.",
  },
  {
    name: "Opportunities",
    path: "/crm",
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
      "Persistent AI chat interface with full tool calling over live workspace data. Ask plain-language questions about customers, pipeline, revenue, and follow-ups. The AI can create follow-ups, update job status, and add customers directly from chat. Rate-limited per tier — 5 requests/day on Standard, 20 on Pro.",
  },
];

const sectors = [
  {
    sector: "General Business",
    wording: "Relationships, opportunities, work items, revenue records, and actions.",
  },
  {
    sector: "Medical / Dental / Healthcare",
    wording: "Patients, treatment opportunities, appointments, collections, and patient actions.",
  },
  {
    sector: "Construction / Contractor",
    wording: "Customers, estimates, projects, payments, and project actions.",
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
    status: "Available",
  },
  {
    name: "QuickBooks",
    description:
      "Sync revenue records and payment status from QuickBooks. Matches payments to open revenue records so unpaid work stays accurate.",
    status: "Available",
  },
  {
    name: "HubSpot",
    description:
      "Import contacts and deal data from HubSpot. Useful for businesses moving from a sales-focused CRM into an operations-focused workspace.",
    status: "Available",
  },
  {
    name: "Square",
    description:
      "Connect Square to pull payment records directly into the revenue layer. Reduces manual entry for businesses using Square at point of sale.",
    status: "Available",
  },
  {
    name: "Google Sheets",
    description:
      "Import data from a Google Sheet — customers, leads, or revenue records. A good bridge for businesses still running on spreadsheets.",
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
  ["Contacts", "#contacts"],
  ["Agent Inbox", "#agent"],
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#090e1a] text-white">
      <PublicNav active="docs" />

      {/* Header */}
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4A3FA8]" />
          UnifData Docs
        </div>
        <h1 className="mt-5 max-w-4xl text-[38px] font-semibold leading-[1.05] tracking-tight md:text-5xl">
          Documentation for the business operating system.
        </h1>
        <p className="mt-5 max-w-3xl text-[16px] leading-[1.7] text-slate-300">
          UnifData helps local businesses organize relationships, opportunities, work, revenue, actions, imports, and AI summaries into one industry-aware workspace.
        </p>
      </div>

      <div className="border-t border-white/8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 py-8 lg:grid-cols-[240px_1fr]">
            {/* Sidebar */}
            <aside className="h-fit rounded-[14px] border border-white/10 bg-white/4 p-4 lg:p-5 lg:sticky lg:top-[72px]">
              <p className="text-[12px] font-semibold text-slate-300">Contents</p>
              <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar text-[13px] lg:grid lg:gap-0.5 lg:overflow-visible">
                {navItems.map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="whitespace-nowrap rounded-full border border-white/10 px-3.5 py-1.5 font-medium text-slate-400 hover:bg-white/8 hover:text-white transition-colors lg:whitespace-normal lg:rounded-[8px] lg:border-0 lg:px-3 lg:py-2"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </aside>

            <div className="divide-y divide-white/8">
              {/* GETTING STARTED */}
              <section id="start" className="scroll-mt-20 py-10">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Quick start
                </p>
                <h2 className="mt-2 text-[24px] font-semibold">Getting started</h2>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-slate-300">
                  UnifData is built around a single company workspace. Every record — customers, leads, jobs, sales, and follow-ups — belongs to a company. Create a workspace, choose the business sector, and start adding records.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    { step: "01", title: "Create a workspace", body: "Sign up and complete onboarding. Choose the business sector that matches the company — the workspace will adapt its language and priorities accordingly." },
                    { step: "02", title: "Import or add records", body: "Bring in existing customers via CSV import, or add them manually. Then add leads, jobs, sales, and follow-ups to start building the operating picture." },
                    { step: "03", title: "Work from the Today page", body: "The /workspace page shows what needs attention today — overdue follow-ups, open quotes, unpaid work, and data quality issues." },
                  ].map((item) => (
                    <div key={item.step} className="rounded-[14px] border border-white/10 bg-white/4 p-5">
                      <p className="text-[11px] font-semibold tracking-[0.13em] text-slate-500">{item.step}</p>
                      <p className="mt-3 text-[14px] font-semibold">{item.title}</p>
                      <p className="mt-2 text-[13px] leading-[1.65] text-slate-300">{item.body}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[12px] border border-ud-accent/30 bg-[#4A3FA8]/10 px-5 py-4">
                  <p className="text-[13px] font-semibold text-ud-accent">Tip: Start with your customer list</p>
                  <p className="mt-1 text-[13px] leading-[1.65] text-slate-300">
                    Importing customers first means leads, jobs, sales, and follow-ups can be linked to real records from the start. A CSV with just name, phone, and email is enough to get going.
                  </p>
                </div>
              </section>

              {/* OVERVIEW */}
              <section id="overview" className="scroll-mt-20 py-10">
                <h2 className="text-[24px] font-semibold">Overview</h2>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-slate-300">
                  UnifData is built for businesses that have important information scattered across spreadsheets, QuickBooks, old CRMs, texts, inboxes, and memory. The goal is to give business owners one clear place to see what needs attention, what work is active, what money is unpaid, and what data needs cleanup.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    { title: "Organize business activity", description: "Customers, leads, jobs, sales, and follow-ups all live in one place and connect to each other." },
                    { title: "Adapt to the business type", description: "Language, labels, and priorities shift based on the company's industry and operating model." },
                    { title: "Turn updates into connected workflow", description: "Marking an opportunity won automatically creates the linked work and revenue records." },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[14px] border border-white/10 bg-white/4 p-5">
                      <p className="text-[14px] font-semibold">{item.title}</p>
                      <p className="mt-2 text-[13px] leading-[1.65] text-slate-300">{item.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* LIFECYCLE */}
              <section id="lifecycle" className="scroll-mt-20 py-10">
                <h2 className="text-[24px] font-semibold">Core lifecycle</h2>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-slate-300">
                  UnifData organizes every business around five layers. The labels change based on the company sector, but the structure stays the same across all industries.
                </p>

                <div className="mt-6 grid gap-3">
                  {lifecycle.map((item, index) => (
                    <div
                      key={item.title}
                      className="grid gap-4 rounded-[14px] border border-white/10 bg-white/4 p-5 md:grid-cols-[56px_1fr_auto] md:items-center"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/10 text-[13px] font-semibold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold">{item.title}</p>
                        <p className="mt-1 text-[13px] leading-[1.6] text-slate-300">{item.description}</p>
                      </div>
                      <p className="text-[11.5px] font-medium text-slate-500 md:text-right">{item.examples}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* PRODUCT PAGES */}
              <section id="pages" className="scroll-mt-20 py-10">
                <h2 className="text-[24px] font-semibold">Product pages</h2>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-slate-300">
                  Each page in UnifData covers a specific part of the business operating layer. Pages are accessible from the main navigation after logging in.
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {pages.map((page) => (
                    <div key={page.path} className="rounded-[14px] border border-white/10 bg-white/4 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <p className="text-[14px] font-semibold">{page.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-ud-accent/20 px-2.5 py-0.5 text-[11px] font-semibold text-ud-accent">
                            {page.tag}
                          </span>
                          <code className="rounded-[6px] border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                            {page.path}
                          </code>
                        </div>
                      </div>
                      <p className="mt-3 text-[13px] leading-[1.65] text-slate-300">{page.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* INDUSTRY LANGUAGE */}
              <section id="industries" className="scroll-mt-20 py-10">
                <h2 className="text-[24px] font-semibold">Industry-aware language</h2>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-slate-300">
                  The same five-layer lifecycle powers every workspace. What changes is the language. A dental office should see &quot;Patients&quot; and &quot;Appointments&quot; — not &quot;Customers&quot; and &quot;Jobs.&quot; UnifData adapts the workspace labels and priorities to the company&apos;s operating model during onboarding.
                </p>

                <div className="mt-6 overflow-hidden rounded-[14px] border border-white/10">
                  <div className="hidden border-b border-white/8 bg-white/6 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500 md:grid md:grid-cols-[200px_1fr]">
                    <span>Sector</span>
                    <span>Workspace language</span>
                  </div>
                  {sectors.map((item, i) => (
                    <div
                      key={item.sector}
                      className={`grid gap-3 px-5 py-4 md:grid-cols-[200px_1fr] ${i % 2 === 0 ? "bg-white/3" : "bg-white/5"}`}
                    >
                      <p className="text-[13.5px] font-semibold">{item.sector}</p>
                      <p className="text-[13px] leading-[1.6] text-slate-300">{item.wording}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* CONNECTED WORKFLOW */}
              <section id="sync" className="scroll-mt-20 py-10">
                <h2 className="text-[24px] font-semibold">Connected workflow</h2>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-slate-300">
                  When an opportunity is marked accepted or won, UnifData can create the connected work record and expected revenue record. Payment status stays separate, so accepted business does not automatically mean the money has been collected.
                </p>

                <div className="mt-6 overflow-hidden rounded-[14px] border border-white/10 bg-white/6">
                  <div className="grid divide-y divide-white/8 md:grid-cols-3 md:divide-x md:divide-y-0">
                    {[
                      { step: "01", label: "Opportunity accepted", detail: "Lead or quote is marked won or accepted by the business." },
                      { step: "02", label: "Work created", detail: "A linked job, appointment, or project record is generated automatically." },
                      { step: "03", label: "Revenue tracked as unpaid", detail: "A revenue record is created with payment status set to unpaid until collected." },
                    ].map((item) => (
                      <div key={item.step} className="p-6">
                        <p className="text-[11px] font-semibold tracking-[0.13em] text-slate-500">{item.step}</p>
                        <p className="mt-3 text-[14px] font-semibold">{item.label}</p>
                        <p className="mt-2 text-[13px] leading-[1.65] text-slate-400">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-[12px] border border-amber-500/20 bg-amber-500/10 px-5 py-4">
                  <p className="text-[13px] font-semibold text-amber-400">Payment status is always separate</p>
                  <p className="mt-1 text-[13px] leading-[1.65] text-slate-300">
                    Marking a job complete or an opportunity won does not mark the revenue as paid. Payment status must be updated separately so unpaid work stays visible on the Today page until the money is actually collected.
                  </p>
                </div>
              </section>

              {/* INTEGRATIONS */}
              <section id="integrations" className="scroll-mt-20 py-10">
                <h2 className="text-[24px] font-semibold">Integrations</h2>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-slate-300">
                  UnifData connects to the tools local businesses already use. Integrations pull records into the workspace so you are not re-entering data from Jobber, QuickBooks, HubSpot, Square, or Google Sheets. Connect and manage integrations from{" "}
                  <Link href="/settings" className="font-semibold text-white hover:underline">Settings</Link>.
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {integrations.map((integration) => (
                    <div key={integration.name} className="rounded-[14px] border border-white/10 bg-white/4 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[14px] font-semibold">{integration.name}</p>
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                          {integration.status}
                        </span>
                      </div>
                      <p className="mt-3 text-[13px] leading-[1.65] text-slate-300">{integration.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 overflow-hidden rounded-[14px] border border-white/10 bg-white/6">
                  <div className="grid divide-y divide-white/8 p-0 md:grid-cols-3 md:divide-x md:divide-y-0">
                    {[
                      { step: "01", label: "Connect in Settings", detail: "Go to Settings and click Connect next to the integration you want to enable." },
                      { step: "02", label: "Authorize access", detail: "Complete the OAuth flow for the connected service. UnifData only reads the data it needs." },
                      { step: "03", label: "Records sync in", detail: "Customers, jobs, and revenue records are pulled into the workspace and linked to existing data where possible." },
                    ].map((item) => (
                      <div key={item.step} className="p-6">
                        <p className="text-[11px] font-semibold tracking-[0.13em] text-slate-500">{item.step}</p>
                        <p className="mt-3 text-[14px] font-semibold">{item.label}</p>
                        <p className="mt-2 text-[13px] leading-[1.65] text-slate-400">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* IMPORTS */}
              <section id="imports" className="scroll-mt-20 py-10">
                <h2 className="text-[24px] font-semibold">Imports</h2>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-slate-300">
                  The import flow supports customer CSV files. Each import is logged as a batch so you can track what was created and when. Records that already exist are not duplicated — the import creates new customer records only.
                </p>

                <div className="mt-6 overflow-hidden rounded-[14px] border border-white/10">
                  <div className="hidden border-b border-white/8 bg-white/6 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500 md:grid md:grid-cols-[140px_80px_1fr_160px]">
                    <span>Column</span>
                    <span>Required</span>
                    <span>Description</span>
                    <span>Example</span>
                  </div>
                  {csvColumns.map((col, i) => (
                    <div
                      key={col.column}
                      className={`grid gap-2 px-5 py-4 text-[13px] md:grid-cols-[140px_80px_1fr_160px] ${i % 2 === 0 ? "bg-white/3" : "bg-white/5"}`}
                    >
                      <code className="font-semibold text-white">{col.column}</code>
                      <span>
                        {col.required ? (
                          <span className="rounded-full bg-ud-accent/25 px-2.5 py-0.5 text-[11px] font-semibold text-ud-accent">
                            Required
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
                            Optional
                          </span>
                        )}
                      </span>
                      <span className="text-slate-300">{col.description}</span>
                      <code className="text-[11.5px] text-slate-500">{col.example}</code>
                    </div>
                  ))}
                </div>

                <p className="mt-5 text-[13px] font-semibold">Example CSV</p>
                <pre className="mt-2 overflow-x-auto rounded-[14px] border border-white/8 bg-white/4 p-5 text-[13px] leading-[1.7] text-slate-300">{`name,phone,email,address,customer_type,notes\nMike Johnson,808-555-0110,mike@example.com,Kailua-Kona HI,Residential,Interested in monthly service`}</pre>
              </section>

              {/* AI ADVISOR */}
              <section id="ai" className="scroll-mt-20 py-10">
                <h2 className="text-[24px] font-semibold">AI Advisor</h2>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-slate-300">
                  The AI Advisor generates a plain-English business brief from the live data in the workspace. It reads the current state of customers, leads, jobs, sales, and follow-ups, then produces a structured summary with three sections: an overall snapshot, what needs attention, and recommended next actions.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    { title: "Overall summary", body: "A high-level read of where the business stands — revenue this month, active work, open pipeline, and customer count." },
                    { title: "What needs attention", body: "Flags overdue follow-ups, unpaid revenue, stale leads, and data quality issues that could cost the business money." },
                    { title: "Recommended next actions", body: "Three specific actions the business owner should take based on the current data — not generic advice." },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[14px] border border-white/10 bg-white/4 p-5">
                      <p className="text-[14px] font-semibold">{item.title}</p>
                      <p className="mt-2 text-[13px] leading-[1.65] text-slate-300">{item.body}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 overflow-hidden rounded-[14px] border border-white/10 bg-white/6 p-6">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Example output
                  </p>
                  <div className="mt-4 space-y-4 text-[13px] leading-[1.7] text-slate-300">
                    <div>
                      <p className="font-semibold text-white">Overall summary</p>
                      <p className="mt-1">Precision Landscape has 42 customers, 6 active jobs, and $3,850 in unpaid work. Monthly revenue is $12,400 with $18,200 in open quotes.</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white">What needs attention</p>
                      <p className="mt-1">4 follow-ups are overdue. 3 customer records are missing contact details, which limits outreach. $3,850 in completed work has not been marked paid.</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Recommended next actions</p>
                      <ul className="mt-1 list-disc pl-5 space-y-1">
                        <li>Follow up on the 4 overdue reminders before end of day.</li>
                        <li>Collect payment on the $3,850 in completed unpaid jobs.</li>
                        <li>Update the 3 incomplete customer records with phone or email.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[12px] border border-ud-accent/30 bg-[#4A3FA8]/10 px-5 py-4">
                  <p className="text-[13px] font-semibold text-ud-accent">Get better results with more data</p>
                  <p className="mt-1 text-[13px] leading-[1.65] text-slate-300">
                    The AI Advisor is most useful after the workspace has real records. Add customers, leads, jobs, sales, and follow-ups first. A workspace with only a few records will produce a thinner summary.
                  </p>
                </div>
              </section>

              <section id="contacts" className="scroll-mt-20 py-10">
                <h2 className="text-[24px] font-semibold">Contacts</h2>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-slate-300">
                  The Contacts page is the unified view of every person or business the workspace has a relationship with. Unlike the People records page — which is the editing surface — Contacts is the intelligence surface. It shows relationship status, activity history, linked records, tags, and segment groups in one place.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    { title: "Synced from everywhere", body: "Contacts are created and updated from manual entry, CSV imports, the onboarding wizard, the AI assistant, and connected integrations. Every write path keeps the contact record current." },
                    { title: "Full activity timeline", body: "Each contact has an activity tab showing every interaction — jobs completed, sales logged, follow-ups created, and messages sent — in chronological order." },
                    { title: "Tags and segments", body: "Tag contacts manually or let the system apply smart group segments automatically based on relationship status, source, and activity patterns." },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[14px] border border-white/10 bg-white/4 p-5">
                      <p className="text-[14px] font-semibold">{item.title}</p>
                      <p className="mt-2 text-[13px] leading-[1.65] text-slate-300">{item.body}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="agent" className="scroll-mt-20 py-10">
                <h2 className="text-[24px] font-semibold">Agent Inbox</h2>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-slate-300">
                  The Agent Inbox sits on the workspace dashboard and surfaces AI-generated outreach drafts and operational alerts. Every night, the agent pipeline reads live workspace data and decides what needs attention — stale customers, unpaid revenue, overdue follow-ups — then drafts actions for review.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    { title: "Outreach drafts", body: "The agent drafts follow-up emails and SMS messages for customers who haven't been contacted recently or have open unpaid work. Each draft includes the AI's reasoning. Approve to send, dismiss to skip." },
                    { title: "Revenue alerts", body: "Surfaces revenue drops, unpaid invoices older than 30 days, and significant changes in pipeline value. Each alert includes the specific records driving the signal." },
                    { title: "Co-Pilot mode", body: "Default mode. Drafts queue for your approval before anything is sent. Full control over every outreach action." },
                    { title: "Autopilot mode (Pro)", body: "Outreach emails and SMS fire automatically without approval. Enable in Settings once the agent pipeline is calibrated to the business." },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[14px] border border-white/10 bg-white/4 p-5">
                      <p className="text-[14px] font-semibold">{item.title}</p>
                      <p className="mt-2 text-[13px] leading-[1.65] text-slate-300">{item.body}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-[12px] border border-ud-accent/30 bg-[#4A3FA8]/10 px-5 py-4">
                  <p className="text-[13px] font-semibold text-ud-accent">Pro tier only</p>
                  <p className="mt-1 text-[13px] leading-[1.65] text-slate-300">
                    The Agent Inbox, nightly pipeline, autopilot mode, and ROI counter are available on the Pro plan. Standard accounts see an upgrade prompt.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-white/8 px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-[30px] font-semibold tracking-tight">Ready to build the workspace?</h2>
          <p className="mt-3 text-[15px] text-slate-300">
            Create a company, pick the business sector, and start organizing the operating side of the business.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/waitlist" className="rounded-xl bg-[#4A3FA8] px-6 py-3 font-semibold text-white shadow-[0_8px_28px_rgba(74,63,168,0.40)] hover:bg-[#3D3494]">
              Create workspace
            </Link>
            <Link href="/preview" className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-slate-200 hover:bg-white/8">
              View preview
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/8 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-[13px] text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 UnifData. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-slate-300">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-300">Terms</Link>
            <Link href="/pricing" className="hover:text-slate-300">Pricing</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
