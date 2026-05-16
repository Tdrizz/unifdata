import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";

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
      <PublicNav active="preview" />

      <div className="mx-auto max-w-7xl px-6">
        {/* Hero */}
        <div className="flex flex-col gap-6 py-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ud-faint">
              Product preview
            </p>
            <h1 className="mt-3 text-[38px] font-semibold leading-[1.1] tracking-tight md:text-[52px]">
              One workspace.<br />Every business type.
            </h1>
            <p className="mt-4 text-[15px] leading-[1.7] text-ud-muted">
              UnifData adapts its language and priorities to the industry. A medical office, contractor, and home services crew don&apos;t get the same generic dashboard.
            </p>
          </div>
          <Link
            href="/waitlist"
            className="shrink-0 rounded-[10px] bg-ud-ink px-6 py-3 text-center text-[14px] font-semibold text-white hover:opacity-90"
          >
            Create workspace
          </Link>
        </div>

        {/* Industry workspaces */}
        <div className="border-t border-ud pt-10 pb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ud-faint">
            Industry workspaces
          </p>
          <h2 className="mt-2 text-[22px] font-semibold tracking-tight">
            What you&apos;d see in each workspace
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {sectors.map((s) => (
              <section
                key={s.sector}
                className="overflow-hidden rounded-[14px] border border-ud bg-ud-surface shadow-ud"
              >
                <div className="flex items-start justify-between gap-4 border-b border-ud p-5">
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ud-faint">
                      Industry workspace
                    </p>
                    <h3 className="mt-1.5 text-[18px] font-semibold">{s.sector}</h3>
                    <p className="mt-1 text-[13px] text-ud-muted">{s.focus}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-ud bg-ud-accent-soft px-3 py-1 text-[11px] font-semibold text-ud-accent">
                    Tailored
                  </span>
                </div>

                <div className="grid grid-cols-2 divide-x divide-y divide-ud border-b border-ud">
                  {s.metrics.map(([label, value]) => (
                    <div key={label} className="p-4">
                      <p className="text-[11.5px] font-medium text-ud-muted">{label}</p>
                      <p className="mt-1.5 text-[20px] font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ud-faint">
                    What the owner sees today
                  </p>
                  <div className="mt-3 grid gap-2">
                    {s.insights.map((insight) => (
                      <div
                        key={insight}
                        className="rounded-[10px] bg-ud-surface-soft px-4 py-3 text-[13px] text-ud-muted"
                      >
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* What's inside */}
        <div className="border-t border-ud pt-10 pb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ud-faint">
            What&apos;s inside every workspace
          </p>
          <h2 className="mt-2 text-[22px] font-semibold tracking-tight">
            Everything a business needs to operate clearly.
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-[14px] border border-ud bg-ud-surface p-5 shadow-ud"
              >
                <p className="text-[14px] font-semibold text-ud-ink">{f.title}</p>
                <p className="mt-2 text-[13px] leading-[1.65] text-ud-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA — full width dark band */}
      <div className="bg-ud-ink px-6 py-16 text-white">
        <div className="mx-auto max-w-7xl flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[28px] font-semibold tracking-tight">
              Ready to build your workspace?
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-[1.7] text-white/60">
              Create an account, choose the business sector, and start organizing customers, leads, jobs, revenue, and follow-ups in one place. Takes about two minutes to set up.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              href="/waitlist"
              className="rounded-[10px] bg-white px-6 py-3 text-center text-[14px] font-semibold text-ud-ink hover:bg-white/90"
            >
              Create workspace
            </Link>
            <Link
              href="/docs"
              className="rounded-[10px] border border-white/15 px-6 py-3 text-center text-[14px] font-semibold text-white hover:bg-white/10"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
