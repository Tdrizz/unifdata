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
    focus: "Patient inquiries, appointments, treatment follow-ups, collections",
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
    focus: "Open opportunities, active work, unpaid revenue, daily follow-ups",
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
    <main className="min-h-screen bg-ud-page text-ud-ink">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-ud bg-ud-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 h-14">
          <Link href="/">
            <ProductMark />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-ud-muted hover:bg-ud-surface-sunk hover:text-ud-ink transition-colors"
            >
              Home
            </Link>
            <Link
              href="/docs"
              className="rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-ud-muted hover:bg-ud-surface-sunk hover:text-ud-ink transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/sign-in"
              className="rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-ud-muted hover:bg-ud-surface-sunk hover:text-ud-ink transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/waitlist"
              className="rounded-[9px] bg-ud-ink px-4 py-1.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="rounded-[20px] border border-ud bg-ud-surface shadow-ud-raised p-8 md:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ud-muted">
                Product preview
              </p>
              <h1 className="mt-3 text-[36px] font-semibold tracking-[-0.025em] leading-[1.15] md:text-[48px]">
                One operating system.<br />Different business models.
              </h1>
              <p className="mt-4 text-[15px] leading-[1.7] text-ud-muted">
                UnifData adapts its dashboard language and metrics to the type of company using it. A medical office, contractor, and home services crew should not all run from the same generic workspace.
              </p>
            </div>
            <Link
              href="/waitlist"
              className="shrink-0 rounded-[10px] bg-ud-ink px-6 py-3 text-center text-[14px] font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Create workspace →
            </Link>
          </div>
        </div>

        {/* Industry cards */}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {sectors.map((s) => (
            <section
              key={s.sector}
              className="overflow-hidden rounded-[20px] border border-ud bg-ud-surface shadow-ud"
            >
              <div className="border-b border-ud p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ud-muted">
                      Industry workspace
                    </p>
                    <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">
                      {s.sector}
                    </h2>
                    <p className="mt-1 text-[13px] leading-[1.6] text-ud-muted">
                      {s.focus}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-ud bg-ud-accent-soft px-3 py-1 text-[11px] font-semibold text-ud-accent">
                    Tailored
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-y divide-[rgba(23,22,20,0.06)] border-b border-ud">
                {s.metrics.map(([label, value]) => (
                  <div key={label} className="p-4">
                    <p className="text-[11.5px] font-medium text-ud-muted">{label}</p>
                    <p className="mt-1.5 text-[20px] font-semibold tracking-[-0.015em]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="p-5">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ud-faint">
                  What the owner sees today
                </p>
                <div className="mt-3 grid gap-2">
                  {s.insights.map((insight) => (
                    <div
                      key={insight}
                      className="rounded-[10px] border border-ud bg-ud-surface-soft px-4 py-3 text-[13px] leading-[1.6] text-ud-text"
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
        <div className="mt-8 rounded-[20px] border border-ud bg-ud-surface shadow-ud-raised p-8 md:p-10">
          <div className="max-w-xl">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ud-muted">
              What&apos;s inside every workspace
            </p>
            <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.02em]">
              Everything a business needs to operate clearly.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-[14px] border border-ud bg-ud-surface-soft p-5"
              >
                <p className="font-semibold text-[14px] text-ud-ink">{f.title}</p>
                <p className="mt-2 text-[13px] leading-[1.65] text-ud-muted">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <section className="my-8 rounded-[20px] bg-ud-ink p-10 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[28px] font-semibold tracking-[-0.02em]">
                Ready to build your workspace?
              </h2>
              <p className="mt-3 max-w-xl text-[14px] leading-[1.7] text-white/60">
                Create an account, choose the business sector, and start organizing customers, leads, jobs, revenue, and follow-ups in one place. Takes about two minutes to set up.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/waitlist"
                className="rounded-[10px] bg-white px-6 py-3 text-center text-[14px] font-semibold text-ud-ink hover:bg-white/90 transition-opacity"
              >
                Create workspace
              </Link>
              <Link
                href="/docs"
                className="rounded-[10px] border border-white/15 px-6 py-3 text-center text-[14px] font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Read the docs
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
