"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicNav } from "@/components/PublicNav";

const sectors = [
  {
    label: "Home & field services",
    title: "Home services",
    focus:
      "4 follow-ups due, $12,400 in open quotes, and 3 client records need cleanup.",
    stats: [
      ["Open quote value", "$12.4k"],
      ["Service visits", "7"],
      ["Unpaid work", "$3.8k"],
      ["Data health", "84%"],
    ],
    insights: [
      "Yard cleanups are creating the most quote requests.",
      "Recurring service brings the most repeat revenue.",
      "Three clients are missing phone or email.",
    ],
  },
  {
    label: "Construction",
    title: "Contractor",
    focus:
      "3 estimates pending response, $18,200 in active projects, and 2 customer records missing addresses.",
    stats: [
      ["Open estimate value", "$18.2k"],
      ["Active projects", "5"],
      ["Unpaid work", "$6.1k"],
      ["Data health", "79%"],
    ],
    insights: [
      "Roofing estimates are converting fastest this month.",
      "Two repeat customers haven't been followed up in 30 days.",
      "Several project records are missing completed dates.",
    ],
  },
  {
    label: "Medical & dental",
    title: "Medical office",
    focus:
      "6 recall follow-ups overdue, $8,200 in outstanding balances, and 4 patient records incomplete.",
    stats: [
      ["Open treatment value", "$8.2k"],
      ["Appointments", "18"],
      ["Outstanding balances", "$4.1k"],
      ["Data health", "91%"],
    ],
    insights: [
      "Recall follow-ups are the highest priority today.",
      "New patient inquiries are converting from Google.",
      "Most patient records have usable contact details.",
    ],
  },
  {
    label: "Professional services",
    title: "Professional services",
    focus:
      "3 proposals awaiting approval, $15,800 in active projects, and 1 client record missing contact info.",
    stats: [
      ["Open proposal value", "$15.8k"],
      ["Active projects", "3"],
      ["Unpaid invoices", "$5.2k"],
      ["Data health", "93%"],
    ],
    insights: [
      "Two proposals have been open for more than two weeks.",
      "Retainer clients are producing the most stable revenue.",
      "One client file is missing a primary contact email.",
    ],
  },
  {
    label: "General business",
    title: "General business",
    focus:
      "5 actions due, $9,400 in open opportunities, and 2 records missing contact details.",
    stats: [
      ["Open opportunity value", "$9.4k"],
      ["Active work", "4"],
      ["Unpaid revenue", "$2.6k"],
      ["Data health", "86%"],
    ],
    insights: [
      "Two opportunities haven't been touched in over two weeks.",
      "Referral relationships are producing the strongest revenue.",
      "A handful of records are missing addresses or sources.",
    ],
  },
];

const whyItMatters = [
  {
    num: "01",
    title: "Today's priorities, not yesterday's reports",
    description:
      "See follow-ups due, unpaid work, and stale opportunities every morning — before the day gets away from you.",
  },
  {
    num: "02",
    title: "Built for your industry, not a generic business",
    description:
      "The workspace adapts its language and priorities to your business type. A contractor and a dentist don't see the same dashboard.",
  },
  {
    num: "03",
    title: "Clean data means no lost customers",
    description:
      "Fix missing fields, unlinked records, and incomplete contact info before they cost you a customer.",
  },
];

const workflowCards = [
  {
    step: "01",
    title: "Import your data or connect your tools",
    description:
      "Bring in customers, leads, jobs, sales, and follow-ups from spreadsheets, or connect Jobber, QuickBooks, or HubSpot directly.",
  },
  {
    step: "02",
    title: "UnifData links everything together",
    description:
      "Records link automatically into one view — customers, open work, and revenue — so you stop hunting across tabs.",
  },
  {
    step: "03",
    title: "Act on what needs attention today",
    description:
      "Every morning you see exactly what's urgent: follow-ups due, unpaid work, and records that are incomplete.",
  },
];

const integrations = ["QuickBooks", "Jobber", "HubSpot", "Square", "Google Sheets", "CSV Import"];

export default function HomePage() {
  const [activeSector, setActiveSector] = useState(0);
  const sector = sectors[activeSector];

  return (
    <main className="min-h-screen bg-[#090e1a] text-white">
      <PublicNav />

      {/* Hero */}
      <section className="mx-auto w-full max-w-7xl px-6 pb-10 pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left: headline + CTAs + sector pills */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4A3FA8]" />
              Business CRM for local service businesses
            </div>

            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-[68px]">
              Stop losing revenue to scattered data.
            </h1>

            <p className="mt-5 max-w-lg text-[17px] leading-8 text-slate-300">
              One workspace for your customers, jobs, open quotes, and revenue —
              built to match your industry, so nothing falls through the cracks.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/waitlist"
                className="rounded-xl bg-[#4A3FA8] px-6 py-3 text-center font-semibold text-white shadow-[0_8px_28px_rgba(74,63,168,0.40)] hover:bg-[#3D3494]"
              >
                Request access
              </Link>
              <Link
                href="/preview"
                className="rounded-xl border border-white/15 px-6 py-3 text-center font-semibold text-slate-200 hover:bg-white/8"
              >
                See how it works
              </Link>
            </div>

            <div className="mt-10">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Pick your industry
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sectors.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => setActiveSector(i)}
                    className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-[color,background-color,border-color] duration-[120ms] ease-out active:scale-[0.96] ${
                      activeSector === i
                        ? "border-white/40 bg-white text-slate-950"
                        : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: dashboard card */}
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-3 shadow-2xl shadow-black/40">
            <div className="rounded-[20px] bg-[#f7f6f3] p-5 text-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                    Today&apos;s brief
                  </p>
                  <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
                    {sector.title}
                  </h2>
                </div>
                <span className="rounded-full border border-[#4A3FA8]/20 bg-[#4A3FA8]/10 px-3 py-1 text-[11px] font-semibold text-[#4A3FA8]">
                  Needs attention
                </span>
              </div>

              <div className="mt-4 rounded-[14px] border border-slate-200 bg-white p-4">
                <p className="text-[12px] font-medium text-slate-500">Focus today</p>
                <p className="mt-1.5 text-[14px] font-semibold leading-6">{sector.focus}</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {sector.stats.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[12px] border border-slate-200 bg-white p-3.5"
                  >
                    <p className="text-[11px] font-medium text-slate-500">{label}</p>
                    <p className="mt-1.5 text-[22px] font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-[14px] border border-slate-200 bg-white p-4">
                <p className="text-[13px] font-semibold">What you&apos;d see today</p>
                <div className="mt-3 space-y-2">
                  {sector.insights.map((item) => (
                    <div
                      key={item}
                      className="rounded-[10px] bg-slate-50 px-3.5 py-2.5 text-[12.5px] text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration bar */}
      <section className="border-t border-white/8 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Works with your existing tools
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {integrations.map((name) => (
              <div
                key={name}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-medium text-slate-400"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why it matters */}
      <section className="border-t border-white/8 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Why it matters
            </p>
            <h2 className="mt-3 text-[38px] font-semibold leading-[1.1] tracking-tight">
              Scattered data is where revenue goes to disappear.
            </h2>
            <p className="mt-4 text-[16px] leading-8 text-slate-300">
              Customer info lives in spreadsheets. Follow-ups exist only in memory.
              Revenue gets tracked in a notebook. Jobs arrive by text. UnifData
              pulls it together so you can see what needs attention — and act on it.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {whyItMatters.map((point) => (
              <div
                key={point.num}
                className="rounded-[20px] border border-white/10 bg-white/5 p-7"
              >
                <p className="text-[13px] font-semibold tabular-nums text-[#8B80E0]">
                  {point.num}
                </p>
                <p className="mt-3 text-[17px] font-semibold leading-snug">{point.title}</p>
                <p className="mt-3 text-[14px] leading-7 text-slate-300">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/8 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              How it works
            </p>
            <h2 className="mt-3 text-[38px] font-semibold tracking-tight">
              Set up in minutes, not months
            </h2>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {workflowCards.map((card) => (
              <div
                key={card.step}
                className="rounded-[20px] border border-white/10 bg-[#0d1422] p-7"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#4A3FA8]/20 text-[13px] font-bold text-[#8B80E0]">
                  {card.step}
                </div>
                <p className="mt-5 text-[17px] font-semibold leading-snug">{card.title}</p>
                <p className="mt-3 text-[14px] leading-7 text-slate-300">{card.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-[24px] border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-[30px] font-semibold tracking-tight">
              Five spreadsheets and a notebook is not a system.
            </h2>
            <p className="mt-3 text-slate-300">
              Set up in minutes. Pick your industry, bring in your data, and see
              what needs attention — starting today.
            </p>
            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/waitlist"
                className="rounded-xl bg-[#4A3FA8] px-6 py-3 font-semibold text-white shadow-[0_8px_28px_rgba(74,63,168,0.40)] hover:bg-[#3D3494]"
              >
                Request access
              </Link>
              <Link
                href="/preview"
                className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-slate-200 hover:bg-white/8"
              >
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-white/8 px-6 py-20" id="pricing">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Pricing
            </p>
            <h2 className="mt-3 text-[38px] font-semibold tracking-tight">
              One price. Everything included.
            </h2>
            <p className="mt-3 text-slate-300">
              No tiers, no feature gating. Pay once to get set up, then a flat monthly rate.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-2xl">
            <div className="rounded-[28px] border border-white/15 bg-white/6 p-10 shadow-2xl">
              <div className="grid gap-8 sm:grid-cols-2">
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    One-time setup
                  </p>
                  <div className="mt-3 flex items-end justify-center gap-1">
                    <span className="text-[60px] font-semibold leading-none">$300</span>
                  </div>
                  <p className="mt-2 text-[13px] text-slate-300">
                    Onboarding &amp; data setup — paid once
                  </p>
                </div>
                <div className="text-center sm:border-l sm:border-white/10 sm:pl-8">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Then monthly
                  </p>
                  <div className="mt-3 flex items-end justify-center gap-1">
                    <span className="text-[60px] font-semibold leading-none">$100</span>
                    <span className="mb-2 text-slate-400">/mo</span>
                  </div>
                  <p className="mt-2 text-[13px] text-slate-300">Cancel any time — no contracts</p>
                </div>
              </div>

              <div className="my-8 h-px bg-white/10" />

              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  "CRM for customers, leads, jobs & sales",
                  "Daily priority queue & follow-ups",
                  "Data health scoring & cleanup tools",
                  "CSV import + QuickBooks, Jobber sync",
                  "AI-generated operating briefs",
                  "Secure, isolated workspace",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[13px]">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-slate-200">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/waitlist"
                  className="flex-1 rounded-xl bg-[#4A3FA8] px-5 py-3 text-center font-semibold text-white shadow-[0_8px_28px_rgba(74,63,168,0.40)] hover:bg-[#3D3494]"
                >
                  Request access
                </Link>
                <Link
                  href="/pricing"
                  className="flex-1 rounded-xl border border-white/15 px-5 py-3 text-center font-semibold text-slate-200 hover:bg-white/8"
                >
                  See full pricing details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-[13px] text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 UnifData. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-slate-300">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-300">
              Terms
            </Link>
            <Link href="/docs" className="hover:text-slate-300">
              Docs
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
