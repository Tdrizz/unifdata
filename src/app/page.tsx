"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductMark } from "@/components/ProductMark";

const sectors = [
  {
    label: "Contractors",
    title: "Contractor preview",
    focus:
      "3 estimates pending response, $18,200 in active jobs, and 2 customer records missing addresses.",
    stats: [
      ["Open estimate value", "$18.2k"],
      ["Active jobs", "5"],
      ["Unpaid work", "$6.1k"],
      ["Data health", "79%"],
    ],
    insights: [
      "Roofing estimates are converting fastest this month.",
      "Two repeat customers haven't been followed up in 30 days.",
      "Several job records are missing completed dates.",
    ],
  },
  {
    label: "Landscaping",
    title: "Landscaping preview",
    focus:
      "4 follow-ups due, $12,400 in open quotes, and 3 customer records need cleanup.",
    stats: [
      ["Open quote value", "$12.4k"],
      ["Active jobs", "7"],
      ["Unpaid work", "$3.8k"],
      ["Data health", "84%"],
    ],
    insights: [
      "Yard cleanups are creating the most quote requests.",
      "Mowing brings the most repeat revenue.",
      "Three customers are missing phone or email.",
    ],
  },
  {
    label: "Dental offices",
    title: "Dental office preview",
    focus:
      "6 recall follow-ups overdue, $8,200 in outstanding balances, and 4 patient records incomplete.",
    stats: [
      ["Open inquiry value", "$8.2k"],
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
    label: "Insurance agencies",
    title: "Insurance agency preview",
    focus:
      "9 renewals due this week, $6,700 in open prospects, and several policies missing source tracking.",
    stats: [
      ["Open prospect value", "$6.7k"],
      ["Renewals due", "9"],
      ["Unpaid commissions", "$1.25k"],
      ["Data health", "79%"],
    ],
    insights: [
      "Renewal follow-ups should be handled before Friday.",
      "Referral leads are converting better than paid ads.",
      "Several policies are missing source tracking.",
    ],
  },
  {
    label: "Auto dealerships",
    title: "Auto dealership preview",
    focus:
      "5 vehicle inquiries need follow-up, $42,000 in pending deals, and 2 customer files incomplete.",
    stats: [
      ["Open deal value", "$42k"],
      ["Active inquiries", "5"],
      ["Unpaid sales", "$11.5k"],
      ["Data health", "88%"],
    ],
    insights: [
      "Trade-in inquiries are converting to deals this week.",
      "Two high-value prospects haven't been contacted in 5 days.",
      "Finance records are missing for three recent sales.",
    ],
  },
  {
    label: "Professional services",
    title: "Professional services preview",
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
];

const platformPoints = [
  {
    title: "Today’s priorities",
    description:
      "See follow-ups, unpaid work, stale opportunities, and data issues before they turn into lost revenue.",
  },
  {
    title: "Industry-aware CRM",
    description:
      "The workspace changes language and priorities based on the business type.",
  },
  {
    title: "Data management",
    description:
      "Clean up messy customer lists, missing fields, unlinked records, and scattered business data.",
  },
];

const workflowCards = [
  {
    label: "1",
    title: "Import or add records",
    description:
      "Bring in customers, leads, jobs, sales, and follow-ups from spreadsheets or manual entry.",
  },
  {
    label: "2",
    title: "Organize the business",
    description:
      "FrontierOps connects records into a cleaner operating system for the company.",
  },
  {
    label: "3",
    title: "Act on what matters",
    description:
      "Owners see the next actions, money at risk, and records that need cleanup.",
  },
];

export default function HomePage() {
  const [activeSector, setActiveSector] = useState(1); // default: Landscaping
  const sector = sectors[activeSector];

  return (
    <main className="min-h-screen bg-[#090e1a] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/">
            <ProductMark inverse />
          </Link>

          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/preview"
              className="hidden rounded-full px-4 py-2 font-medium text-slate-300 hover:bg-white/10 hover:text-white sm:block"
            >
              Preview
            </Link>

            <Link
              href="/docs"
              className="hidden rounded-full px-4 py-2 font-medium text-slate-300 hover:bg-white/10 hover:text-white sm:block"
            >
              Docs
            </Link>

            <Link
              href="/login"
              className="rounded-full px-4 py-2 font-medium text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Log in
            </Link>

            <Link
              href="/signup"
              className="rounded-full bg-white px-4 py-2 font-semibold text-slate-950 hover:bg-slate-200"
            >
              Start
            </Link>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-slate-300">
              CRM + Data Management for messy local businesses
            </div>

            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Turn scattered business data into a daily operating system.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              FrontierOps helps businesses organize their relationships,
              opportunities, work, and revenue into one clean, industry-aware
              workspace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/preview"
                className="rounded-2xl bg-white px-5 py-3 text-center font-semibold text-slate-950 hover:bg-slate-200"
              >
                View Product Preview
              </Link>

              <Link
                href="/signup"
                className="rounded-2xl border border-white/15 px-5 py-3 text-center font-semibold text-white hover:bg-white/10"
              >
                Create workspace
              </Link>
            </div>

            <p className="mt-10 text-xs font-medium uppercase tracking-widest text-slate-500">
              Select an industry
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sectors.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => setActiveSector(i)}
                  className={`rounded-full border px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    activeSector === i
                      ? "border-white/40 bg-white text-slate-950"
                      : "border-white/10 bg-white/6 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-4xl border border-white/10 bg-white/6 p-3 shadow-2xl">
            <div className="rounded-3xl bg-slate-50 p-5 text-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Today’s brief
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {sector.title}
                  </h2>
                </div>

                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Needs attention
                </span>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-500">
                  Today’s focus
                </p>
                <p className="mt-2 text-lg font-semibold leading-7">
                  {sector.focus}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {sector.stats.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs font-medium text-slate-500">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
                <p className="font-semibold">What FrontierOps sees</p>
                <div className="mt-4 space-y-3">
                  {sector.insights.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
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

      <section className="border-t border-white/10 bg-white/3 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Why it matters
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">
              Most businesses do not have bad businesses. They have messy data.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-300">
              Customer info sits in spreadsheets. Follow-ups sit in memory.
              Revenue sits in an old notebook. Jobs sit in texts. FrontierOps
              gives owners one clean place to organize the operating side of the
              business.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {platformPoints.map((point) => (
              <div
                key={point.title}
                className="rounded-3xl border border-white/10 bg-white/6 p-6"
              >
                <p className="text-lg font-semibold">{point.title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {point.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {workflowCards.map((card) => (
              <div
                key={card.title}
                className="rounded-3xl border border-white/10 bg-[#090e1a] p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-950">
                  {card.label}
                </div>
                <p className="mt-5 text-lg font-semibold">{card.title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-16 rounded-3xl border border-white/10 bg-white/6 p-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">
              Ready to turn your messy data into a clean workspace?
            </h2>
            <p className="mt-3 text-slate-300">
              Create a company, choose the business sector, and start building
              the operating system around what actually matters.
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
                View Product Preview
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
