import type { Metadata } from "next";
import Link from "next/link";
import { ProductMark } from "@/components/ProductMark";

export const metadata: Metadata = {
  title: "Product Preview",
  description:
    "See how UnifData adapts to different business types — home services, construction, medical, professional services, and general business.",
};

const sectors = [
  {
    sector: "Home & Field Services",
    focus: "Open quotes, scheduled service, unpaid work, client follow-ups",
    metrics: [
      ["Open quote value", "$12,400"],
      ["Service visits", "7"],
      ["Unpaid work", "$3,850"],
      ["Data health", "84%"],
    ],
    insights: [
      "Yard cleanups are creating the most quote requests.",
      "Recurring service is producing the most repeat revenue.",
      "Three client records are missing contact details.",
    ],
  },
  {
    sector: "Construction",
    focus: "Estimates, active projects, unpaid work, customer follow-ups",
    metrics: [
      ["Open estimate value", "$18,200"],
      ["Active projects", "5"],
      ["Unpaid work", "$6,100"],
      ["Data health", "79%"],
    ],
    insights: [
      "Roofing estimates are converting fastest this month.",
      "Two repeat customers haven't been followed up in 30 days.",
      "Several project records are missing completed dates.",
    ],
  },
  {
    sector: "Medical & Dental",
    focus:
      "Patient inquiries, appointments, treatment follow-ups, collections",
    metrics: [
      ["Open treatment value", "$8,200"],
      ["Appointments", "18"],
      ["Outstanding balances", "$4,100"],
      ["Data health", "91%"],
    ],
    insights: [
      "Recall follow-ups are the highest priority today.",
      "New patient inquiries are converting from Google.",
      "Most patient records have usable contact details.",
    ],
  },
  {
    sector: "Professional Services",
    focus: "Proposals, active projects, unpaid invoices, client follow-ups",
    metrics: [
      ["Open proposal value", "$15,800"],
      ["Active projects", "3"],
      ["Unpaid invoices", "$5,200"],
      ["Data health", "93%"],
    ],
    insights: [
      "Two proposals have been open for more than two weeks.",
      "Retainer clients are producing the most stable revenue.",
      "One client file is missing a primary contact email.",
    ],
  },
  {
    sector: "General Business",
    focus:
      "Open opportunities, active work, unpaid revenue, daily follow-ups",
    metrics: [
      ["Open opportunity value", "$9,400"],
      ["Active work", "4"],
      ["Unpaid revenue", "$2,600"],
      ["Data health", "86%"],
    ],
    insights: [
      "Two opportunities haven't been touched in over two weeks.",
      "Referral relationships are producing the strongest revenue.",
      "A handful of records are missing addresses or sources.",
    ],
  },
];

const features = [
  {
    title: "Today page",
    description:
      "A daily brief showing follow-ups due, unpaid work, open opportunities, and data issues — before they turn into lost revenue.",
  },
  {
    title: "Industry-aware CRM",
    description:
      "The workspace adapts its language and priorities to the business type chosen during onboarding.",
  },
  {
    title: "Data Hub",
    description:
      "Tracks record completeness, flags missing fields, and shows a data health score across the whole workspace.",
  },
  {
    title: "CSV imports",
    description:
      "Bring in existing customer lists from spreadsheets. Records are validated and created as a logged import batch.",
  },
  {
    title: "Connected workflow",
    description:
      "Marking an opportunity won creates the linked work and revenue records automatically.",
  },
  {
    title: "AI Advisor",
    description:
      "Generates a plain-English business brief with an overall summary, what needs attention, and three next actions.",
  },
];

export default function PreviewPage() {
  return (
    <main className="min-h-screen bg-[#eef2f7] text-slate-950">
      <section className="mx-auto max-w-7xl px-6 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/">
            <ProductMark companyName="Product Preview" />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Home
            </Link>
            <Link
              href="/docs"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Docs
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Log in
            </Link>
            <Link
              href="/waitlist"
              className="rounded-full bg-[#1D2D3E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a3f57]"
            >
              Start
            </Link>
          </div>
        </nav>

        {/* Header */}
        <div className="mt-12 rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Product preview
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
                One operating system. Different business models.
              </h1>
              <p className="mt-4 text-base leading-8 text-slate-600">
                UnifData adapts its dashboard language and metrics to the
                type of company using it. A medical office, contractor, and home
                services crew should not all run from the same generic
                workspace.
              </p>
            </div>
            <Link
              href="/waitlist"
              className="shrink-0 rounded-2xl bg-[#1D2D3E] px-6 py-3 text-center text-sm font-semibold text-white hover:bg-[#2a3f57]"
            >
              Create workspace →
            </Link>
          </div>
        </div>

        {/* Industry cards */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {sectors.map((s) => (
            <section
              key={s.sector}
              className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Industry workspace
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                      {s.sector}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {s.focus}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    Tailored
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-b border-slate-100">
                {s.metrics.map(([label, value]) => (
                  <div key={label} className="p-4">
                    <p className="text-xs font-medium text-slate-500">
                      {label}
                    </p>
                    <p className="mt-1.5 text-xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  What the owner sees today
                </p>
                <div className="mt-3 grid gap-2">
                  {s.insights.map((insight) => (
                    <div
                      key={insight}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
                    >
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* What's inside */}
        <div className="mt-10 rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              What&apos;s inside every workspace
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Everything a business needs to operate clearly.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="font-semibold text-slate-950">{f.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <section className="my-10 rounded-4xl bg-[#1D2D3E] p-10 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Ready to build your workspace?
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
                Create an account, choose the business sector, and start
                organizing customers, leads, jobs, revenue, and follow-ups in
                one place. Takes about two minutes to set up.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/waitlist"
                className="rounded-2xl bg-white px-6 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-slate-200"
              >
                Create workspace
              </Link>
              <Link
                href="/docs"
                className="rounded-2xl border border-white/15 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
              >
                Read the docs
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
