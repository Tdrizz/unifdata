import type { Metadata } from "next";
import Link from "next/link";
import { ProductMark } from "@/components/ProductMark";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "FrontierOps documentation for setup, core concepts, workflows, and demo guidance.",
};

const lifecycle = [
  {
    title: "Relationships",
    description:
      "People, customers, clients, patients, companies, or accounts the business works with.",
  },
  {
    title: "Opportunities",
    description:
      "Potential business such as quotes, treatment plans, proposals, policy opportunities, inquiries, or deals.",
  },
  {
    title: "Work",
    description:
      "The delivery layer: jobs, appointments, projects, service visits, orders, policy tasks, or deal tasks.",
  },
  {
    title: "Revenue",
    description:
      "Money tied to the business flow: payments, invoices, collections, commissions, or sales.",
  },
  {
    title: "Actions",
    description:
      "Follow-ups, reminders, callbacks, renewal tasks, patient actions, or next steps.",
  },
];

const pages = [
  {
    name: "Today",
    path: "/workspace",
    description:
      "Daily operating brief showing what needs attention across follow-ups, open opportunities, active work, unpaid revenue, and data quality.",
  },
  {
    name: "Pipeline",
    path: "/crm",
    description:
      "Relationship and opportunity view for understanding where business is sitting and what needs follow-up.",
  },
  {
    name: "Data Hub",
    path: "/data-hub",
    description:
      "Business data command center for record quality, completeness, cleanup items, imports, and recent activity.",
  },
  {
    name: "People",
    path: "/customers",
    description:
      "Stores relationships such as customers, clients, patients, accounts, or companies.",
  },
  {
    name: "Opportunities",
    path: "/leads",
    description:
      "Tracks potential business, status, source, estimated value, follow-up dates, and connected business flow.",
  },
  {
    name: "Work",
    path: "/jobs",
    description:
      "Tracks delivery and fulfillment records such as jobs, appointments, projects, service visits, or orders.",
  },
  {
    name: "Revenue",
    path: "/sales",
    description:
      "Tracks payments, invoices, collections, commissions, sales, source, service type, and payment status.",
  },
  {
    name: "Actions",
    path: "/follow-ups",
    description:
      "Tracks reminders, follow-ups, callbacks, overdue tasks, and completed action items.",
  },
  {
    name: "Imports",
    path: "/imports",
    description:
      "Imports customer lists from CSV and turns spreadsheet data into structured records.",
  },
  {
    name: "AI Advisor",
    path: "/ai-assistant",
    description:
      "Generates a plain-English business brief from the company’s current records and activity.",
  },
];

const sectors = [
  {
    sector: "Field Service",
    wording: "Clients, quotes, service visits, payments, and client actions.",
  },
  {
    sector: "Dental / Medical",
    wording:
      "Patients, treatment opportunities, appointments, collections, and patient actions.",
  },
  {
    sector: "Insurance",
    wording:
      "Clients, policy opportunities, policy tasks, commission records, and renewal actions.",
  },
  {
    sector: "Automotive",
    wording:
      "Customers, vehicle opportunities, deal tasks, vehicle sales, and customer actions.",
  },
  {
    sector: "Professional Services",
    wording: "Clients, proposals, projects, invoices, and client actions.",
  },
  {
    sector: "Retail",
    wording: "Customers, inquiries, orders, sales, and customer actions.",
  },
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
              href="/dashboard"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Demo
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Log in
            </Link>
          </div>
        </nav>

        <header className="mt-12 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            FrontierOps Docs
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            Documentation for the business operating system.
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            FrontierOps helps local businesses organize relationships,
            opportunities, work, revenue, actions, imports, and AI summaries
            into one industry-aware workspace.
          </p>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <p className="text-sm font-semibold text-slate-950">Contents</p>

            <div className="mt-4 grid gap-2 text-sm">
              {[
                ["Overview", "#overview"],
                ["Core lifecycle", "#lifecycle"],
                ["Product pages", "#pages"],
                ["Industry language", "#industries"],
                ["Opportunity sync", "#sync"],
                ["Imports", "#imports"],
                ["AI Advisor", "#ai"],
                ["Demo checklist", "#demo"],
              ].map(([label, href]) => (
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
            <section
              id="overview"
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                Overview
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                FrontierOps is built for businesses that have important
                information scattered across spreadsheets, QuickBooks, old CRMs,
                texts, inboxes, and memory. The goal is to give business owners
                one clear place to see what needs attention, what work is
                active, what money is unpaid, and what data needs cleanup.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  "Organize business activity",
                  "Adapt to the business type",
                  "Turn updates into connected workflow",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <p className="font-semibold">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section
              id="lifecycle"
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                Core lifecycle
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                FrontierOps uses one business lifecycle internally, then changes
                the language based on the company’s sector.
              </p>

              <div className="mt-6 grid gap-4">
                {lifecycle.map((item, index) => (
                  <div
                    key={item.title}
                    className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-[70px_1fr]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
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
                  </div>
                ))}
              </div>
            </section>

            <section
              id="pages"
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                Product pages
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {pages.map((page) => (
                  <div
                    key={page.path}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-semibold text-slate-950">
                        {page.name}
                      </p>
                      <code className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                        {page.path}
                      </code>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {page.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section
              id="industries"
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                Industry-aware language
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                The same system can support different businesses because the
                workspace changes language around the company’s operating model.
              </p>

              <div className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200">
                {sectors.map((item) => (
                  <div
                    key={item.sector}
                    className="grid gap-3 bg-slate-50 p-5 md:grid-cols-[220px_1fr]"
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

            <section
              id="sync"
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                Connected workflow
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                When an opportunity is marked accepted or won, FrontierOps can
                create the connected work record and expected revenue record.
                Payment status stays separate, so accepted business does not
                automatically mean the money has been collected.
              </p>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white">
                <p className="font-semibold">
                  Opportunity accepted → Work created → Revenue tracked as
                  unpaid
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  This keeps the business flow connected while still letting the
                  company update payment status later when money is actually
                  collected.
                </p>
              </div>
            </section>

            <section
              id="imports"
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">Imports</h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                The current import flow supports customer CSV files. The
                cleanest CSV format uses these columns:
              </p>

              <pre className="mt-5 overflow-x-auto rounded-3xl bg-slate-950 p-5 text-sm leading-7 text-slate-100">
                name,phone,email,address,customer_type,notes
                {"\n"}
                Mike Johnson,808-555-0110,mike@example.com,Kailua-Kona
                HI,Residential,Interested in monthly service
              </pre>
            </section>

            <section
              id="ai"
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                AI Advisor
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                The AI Advisor creates a plain-English business brief from the
                current workspace data. It should be used after adding enough
                relationships, opportunities, work, revenue, and actions to make
                the summary meaningful.
              </p>
            </section>

            <section
              id="demo"
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold tracking-tight">
                Demo checklist
              </h2>

              <div className="mt-6 grid gap-3">
                {[
                  "Open the Today page and explain what needs attention.",
                  "Show the Pipeline page and explain opportunities.",
                  "Edit an opportunity and mark it Accepted / won.",
                  "Show that Work and Revenue records were created.",
                  "Show that revenue stays unpaid until payment is updated.",
                  "Open Data Hub and explain data quality.",
                  "Generate an AI business brief.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
