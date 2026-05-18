import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { SectorSelector } from "./SectorSelector";

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
    title: "Daily priority queue",
    description:
      "Every morning: follow-ups due, unpaid work, open opportunities, and data gaps — before they become lost revenue.",
  },
  {
    title: "Industry-aware CRM",
    description:
      "The workspace adapts its language and priorities to your business type. Choose during onboarding; change any time.",
  },
  {
    title: "Data Hub",
    description:
      "See record completeness across your whole workspace. Missing fields and unlinked records get flagged automatically.",
  },
  {
    title: "CSV imports",
    description:
      "Bring in existing customer lists from spreadsheets. Records are validated, deduplicated, and logged on import.",
  },
  {
    title: "Connected workflow",
    description:
      "Mark an opportunity won and UnifData creates the linked job and revenue records automatically.",
  },
  {
    title: "AI Advisor",
    description:
      "Get a plain-English summary of your business: what's overdue, what's at risk, and three specific next actions.",
  },
];

export default function PreviewPage() {
  return (
    <main className="min-h-screen bg-[#090e1a] text-white">
      <PublicNav dark active="preview" />

      <div className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <div className="py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4A3FA8]" />
            Product preview
          </div>
          <h1 className="mx-auto mt-5 max-w-2xl text-[42px] font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            One workspace.<br />Every business type.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-[1.7] text-slate-300">
            UnifData adapts to your industry. A medical office, a contractor, and a home services crew each get a workspace configured for how they actually work.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/waitlist"
              className="rounded-xl bg-[#4A3FA8] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_8px_28px_rgba(74,63,168,0.40)] hover:bg-[#3D3494]"
            >
              Request access
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-white/15 px-6 py-3 text-[14px] font-semibold text-slate-200 hover:bg-white/8"
            >
              See pricing
            </Link>
          </div>
        </div>

        {/* Industry workspaces */}
        <div className="border-t border-white/8 pt-14 pb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Industry workspaces
          </p>
          <h2 className="mt-2 text-[24px] font-semibold tracking-tight">
            What you&apos;d see in each workspace
          </h2>
          <p className="mt-2 text-[15px] text-slate-400">
            Select your industry to see how the workspace is configured for it.
          </p>

          <div className="mt-8">
            <SectorSelector sectors={sectors} />
          </div>
        </div>

        {/* What's inside */}
        <div className="border-t border-white/8 pt-14 pb-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            What&apos;s inside every workspace
          </p>
          <h2 className="mt-2 text-[24px] font-semibold tracking-tight">
            Everything a business needs to operate clearly.
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="rounded-[14px] border border-white/10 bg-white/4 p-5"
              >
                <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#4A3FA8]/20 text-[12px] font-bold text-[#8B80E0]">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p className="text-[14px] font-semibold">{f.title}</p>
                <p className="mt-1.5 text-[13px] leading-[1.65] text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-white/8 px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-[30px] font-semibold tracking-tight">
            Ready to build your workspace?
          </h2>
          <p className="mt-3 text-[15px] text-slate-300">
            Choose your industry, bring in your data, and see what needs attention today.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/docs"
              className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-slate-200 hover:bg-white/8"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/8 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-[13px] text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 UnifData. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-slate-300">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-300">Terms</Link>
            <Link href="/docs" className="hover:text-slate-300">Docs</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
