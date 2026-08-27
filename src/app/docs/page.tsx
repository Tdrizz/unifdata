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
      "People, customers, clients, companies, or accounts the business works with.",
    examples: "Customers · Clients · Companies · Accounts",
  },
  {
    title: "Opportunities",
    description:
      "Potential business such as quotes, proposals, estimates, inquiries, or deals.",
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
      "Follow-ups, reminders, callbacks, renewal tasks, or next steps.",
    examples: "Follow-ups · Reminders · Callbacks · Renewals",
  },
];

const pages = [
  { name: "Today", path: "/workspace", tag: "Dashboard", description: "Your daily operating brief and the only place Vera lives. Opens with a Vera summary of what needs attention — follow-ups due, unpaid work, stale pipeline — plus a live chat panel to ask Vera anything or have it act. Start here every morning." },
  { name: "Customers", path: "/customers", tag: "Records", description: "Unified contact records. Every person or business the workspace has a relationship with, enriched with relationship status, activity history, and linked records." },
  { name: "Pipeline", path: "/crm", tag: "Overview", description: "Kanban-style view of all opportunities and active work, from lead through paid. Follow-ups/reminders live here too, as due-date badges on their linked lead or job card — there's no separate follow-ups page." },
  { name: "Sales", path: "/sales", tag: "Revenue", description: "All revenue records with payment status. Overdue items surface prominently. The fastest way to see what's been completed but not collected." },
  { name: "Data Hub", path: "/data-hub", tag: "Intelligence", description: "Data quality scoring for all records. Flags missing fields, finds duplicates, shows health percentage. Vera reads from this to prioritize what needs attention." },
  { name: "Imports", path: "/imports", tag: "Data", description: "CSV and Google Sheets import with smart column mapping and staged review. Also manages connected integrations — Jobber, QuickBooks, HubSpot, Square." },
  { name: "Settings", path: "/settings", tag: "Account", description: "Business profile, team members, industry labels, process boards, billing, and notification preferences." },
];

const sectors = [
  {
    sector: "General Business",
    wording: "Relationships, opportunities, work items, revenue records, and actions.",
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
  ["Overview", "#overview"],
  ["The lifecycle model", "#lifecycle"],
  ["Pages", "#pages"],
  ["Vera", "#vera"],
  ["Imports & integrations", "#imports"],
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
          <div className="grid grid-cols-1 gap-8 py-8 lg:grid-cols-[240px_1fr]">
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

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
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

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                      className="grid grid-cols-1 gap-4 rounded-[14px] border border-white/10 bg-white/4 p-5 md:grid-cols-[56px_1fr_auto] md:items-center"
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

                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
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

              {/* VERA */}
              <section id="vera" className="scroll-mt-20 py-10">
                <h2 className="text-[24px] font-semibold mb-4">Vera</h2>
                <p className="text-[13.5px] leading-[1.7] text-slate-300 mb-6">
                  Vera is the AI assistant built into UnifData. Unlike a generic chatbot, Vera has full read access to your live workspace data — customers, jobs, revenue, follow-ups — and runs an analysis every night while your business is closed. Vera lives in a single panel on the Today dashboard — there&apos;s no separate chat page to navigate to.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    { title: "Overnight briefing", body: "Every morning, Vera surfaces what needs attention. Stale customers. Unpaid invoices. Overdue follow-ups. Each item includes the specific record driving the signal." },
                    { title: "Outreach drafts", body: "Vera writes follow-up messages for customers who need contact. Each draft shows the reasoning. Approve to send, skip to dismiss — nothing sends without sign-off." },
                    { title: "Revenue alerts", body: "Flags when invoices are past due, jobs are stalling, or pipeline drops significantly. Shown right in the Vera panel on Today." },
                    { title: "Free-form chat", body: "Ask Vera anything, any time, from the Today dashboard. It can create or update leads, jobs, sales, follow-ups, and contacts directly from chat — not just answer questions." },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[14px] border border-white/10 bg-white/4 p-5">
                      <p className="text-[14px] font-semibold mb-2">{item.title}</p>
                      <p className="text-[13px] leading-[1.65] text-slate-300">{item.body}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* INDUSTRY LANGUAGE */}
              <section id="industries" className="scroll-mt-20 py-10">
                <h2 className="text-[24px] font-semibold">Industry-aware language</h2>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-slate-300">
                  The same five-layer lifecycle powers every workspace. What changes is the language. A law firm should see &quot;Matters&quot; and &quot;Clients&quot; — not &quot;Jobs&quot; and &quot;Customers.&quot; UnifData adapts the workspace labels and priorities to the company&apos;s operating model during onboarding.
                </p>

                <div className="mt-6 overflow-hidden rounded-[14px] border border-white/10">
                  <div className="hidden border-b border-white/8 bg-white/6 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500 md:grid md:grid-cols-[200px_1fr]">
                    <span>Sector</span>
                    <span>Workspace language</span>
                  </div>
                  {sectors.map((item, i) => (
                    <div
                      key={item.sector}
                      className={`grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[200px_1fr] ${i % 2 === 0 ? "bg-white/3" : "bg-white/5"}`}
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
                  <div className="grid grid-cols-1 divide-y divide-white/8 md:grid-cols-3 md:divide-x md:divide-y-0">
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

                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
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
                  <div className="grid grid-cols-1 divide-y divide-white/8 p-0 md:grid-cols-3 md:divide-x md:divide-y-0">
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
                      className={`grid grid-cols-1 gap-2 px-5 py-4 text-[13px] md:grid-cols-[140px_80px_1fr_160px] ${i % 2 === 0 ? "bg-white/3" : "bg-white/5"}`}
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


              <section id="contacts" className="scroll-mt-20 py-10">
                <h2 className="text-[24px] font-semibold">Contacts</h2>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-slate-300">
                  The Contacts page is the unified view of every person or business the workspace has a relationship with. Unlike the People records page — which is the editing surface — Contacts is the intelligence surface. It shows relationship status, activity history, linked records, tags, and segment groups in one place.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    { title: "Outreach drafts", body: "The agent drafts follow-up emails and SMS messages for customers who haven't been contacted recently or have open unpaid work. Each draft includes the AI's reasoning. Approve to send, dismiss to skip." },
                    { title: "Revenue alerts", body: "Surfaces revenue drops, unpaid invoices older than 30 days, and significant changes in pipeline value. Each alert includes the specific records driving the signal." },
                    { title: "Auto-fix data issues", body: "On by default. Vera merges obvious duplicate contacts and clears junk records on its own, nightly and on demand — nothing customer-facing, nothing sent externally. Anything ambiguous is left in Data Hub for review." },
                    { title: "Auto-send outreach", body: "Off by default. Outreach emails and SMS fire automatically without approval once enabled in Settings. Until then, drafts queue in the Agent Inbox for you to approve or dismiss." },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[14px] border border-white/10 bg-white/4 p-5">
                      <p className="text-[14px] font-semibold">{item.title}</p>
                      <p className="mt-2 text-[13px] leading-[1.65] text-slate-300">{item.body}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-[12px] border border-ud-accent/30 bg-[#4A3FA8]/10 px-5 py-4">
                  <p className="text-[13px] font-semibold text-ud-accent">Included for everyone</p>
                  <p className="mt-1 text-[13px] leading-[1.65] text-slate-300">
                    The Agent Inbox, nightly pipeline, both autopilot settings, and ROI counter are part of every account. One price, no tiers, no add-ons behind a paywall.
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
