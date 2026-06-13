"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicNav } from "@/components/PublicNav";

const DEMO_FORM_URL = "DEMO_FORM_URL"; // TODO: Replace with Malachi's Google Form URL before launch

const industries = [
  {
    label: "Home services",
    brief: "Good morning. Here's what needs your attention.",
    stats: [
      { label: "Follow-ups due", value: "4", urgent: true },
      { label: "Open quotes", value: "$12.4k", urgent: false },
      { label: "Unpaid work", value: "$3.8k", urgent: true },
      { label: "Active jobs", value: "7", urgent: false },
    ],
    actions: [
      { type: "draft", text: "Follow-up with David Reyes — roof quote sent 8 days ago, no response.", cta: "Send follow-up" },
      { type: "alert", text: "Marcus Webb's water heater job completed 5 weeks ago. Invoice still unpaid ($1,400)." },
    ],
  },
  {
    label: "Construction",
    brief: "Good morning. Here's what needs your attention.",
    stats: [
      { label: "Pending estimates", value: "3", urgent: true },
      { label: "Active projects", value: "$18.2k", urgent: false },
      { label: "Unpaid work", value: "$6.1k", urgent: true },
      { label: "Scheduled jobs", value: "5", urgent: false },
    ],
    actions: [
      { type: "draft", text: "Check in with Apex Realty — roofing estimate open for 12 days.", cta: "Send check-in" },
      { type: "alert", text: "2 project records are missing completed dates. Revenue may be understated." },
    ],
  },
  {
    label: "Medical & dental",
    brief: "Good morning. Here's what needs your attention.",
    stats: [
      { label: "Recall follow-ups", value: "6", urgent: true },
      { label: "Appointments today", value: "18", urgent: false },
      { label: "Outstanding balances", value: "$4.1k", urgent: true },
      { label: "Data health", value: "91%", urgent: false },
    ],
    actions: [
      { type: "draft", text: "Linda Chen is 6 months overdue for a recall appointment.", cta: "Send recall" },
      { type: "alert", text: "4 patient records are missing a primary contact email." },
    ],
  },
  {
    label: "Professional services",
    brief: "Good morning. Here's what needs your attention.",
    stats: [
      { label: "Open proposals", value: "3", urgent: true },
      { label: "Active projects", value: "$15.8k", urgent: false },
      { label: "Unpaid invoices", value: "$5.2k", urgent: true },
      { label: "Data health", value: "93%", urgent: false },
    ],
    actions: [
      { type: "draft", text: "Follow up with Greenfield Partners — proposal sent 14 days ago.", cta: "Send follow-up" },
      { type: "alert", text: "One client file is missing a primary contact email." },
    ],
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Connect your data",
    body: "Import a spreadsheet or connect Jobber, QuickBooks, HubSpot, or Square. Aria maps your records automatically — customers, jobs, revenue, follow-ups.",
  },
  {
    step: "02",
    title: "Aria learns your business",
    body: "Every night, Aria reviews everything. Stale customers. Unpaid work. Overdue follow-ups. Missed opportunities. It prepares a brief so you don't have to dig.",
  },
  {
    step: "03",
    title: "You make the calls",
    body: "Open the app each morning and see exactly what needs attention. Approve a follow-up, mark a job complete, collect a payment. Aria does the thinking. You make the decisions.",
  },
];

const integrations = ["QuickBooks", "Jobber", "HubSpot", "Square", "Google Sheets", "CSV"];

export default function HomePage() {
  const [activeIndustry, setActiveIndustry] = useState(0);
  const industry = industries[activeIndustry];

  return (
    <main className="min-h-screen bg-[#090e1a] text-white antialiased">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-[#4A3FA8] opacity-[0.09] blur-[160px]" />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[12.5px] font-medium text-slate-400 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7B72D4]" />
              Aria — your AI business assistant
            </div>
            <h1 className="animate-fade-up [animation-delay:60ms] text-[52px] sm:text-[64px] lg:text-[76px] font-semibold leading-[1.02] tracking-[-0.03em] mb-6">
              Your business,<br />briefed every morning.
            </h1>
            <p className="animate-fade-up [animation-delay:120ms] text-[18px] leading-[1.75] text-slate-300 max-w-xl mx-auto mb-10">
              Stop running your business from memory. Aria reviews your customers, jobs, revenue, and follow-ups overnight — and tells you exactly what needs attention when you wake up.
            </p>
            <div className="animate-fade-up [animation-delay:180ms] flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={DEMO_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto rounded-[12px] bg-[#4A3FA8] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_32px_rgba(74,63,168,0.45)] hover:bg-[#3D3494] transition-colors active:scale-[0.97]"
              >
                Book a free demo
              </a>
              <Link
                href="/pricing"
                className="w-full sm:w-auto rounded-[12px] border border-white/12 px-7 py-3.5 text-[15px] font-semibold text-slate-200 hover:bg-white/[0.06] transition-colors active:scale-[0.97]"
              >
                See pricing
              </Link>
            </div>
            <p className="animate-fade-up [animation-delay:240ms] mt-5 text-[12.5px] text-slate-500">
              $300 setup · $100/month · No contracts
            </p>
          </div>

          {/* Industry picker + Aria mock */}
          <div className="mt-16 animate-fade-up [animation-delay:300ms]">
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {industries.map((ind, i) => (
                <button
                  key={ind.label}
                  onClick={() => setActiveIndustry(i)}
                  className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-150 active:scale-[0.96] ${
                    activeIndustry === i
                      ? "border-white/30 bg-white text-slate-950"
                      : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {ind.label}
                </button>
              ))}
            </div>

            <div className="mx-auto max-w-2xl rounded-[24px] border border-white/10 bg-white/[0.04] p-2 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
              <div className="rounded-[18px] bg-[#f6f5f2] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-[5px] bg-[#4A3FA8]/20 flex items-center justify-center">
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#4A3FA8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
                      </svg>
                    </div>
                    <span className="text-[12px] font-semibold text-slate-700">Aria</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Today</span>
                </div>

                <div className="px-5 py-4">
                  <div className="flex gap-3 mb-4">
                    <div className="w-7 h-7 rounded-full bg-[#4A3FA8]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#4A3FA8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
                      </svg>
                    </div>
                    <p className="text-[13px] text-slate-700 leading-relaxed">{industry.brief}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {industry.stats.map((stat) => (
                      <div key={stat.label} className={`rounded-[10px] border p-3 ${stat.urgent ? "border-red-200/60 bg-red-50/60" : "border-black/[0.06] bg-white"}`}>
                        <p className="text-[10px] font-medium text-slate-500 mb-1 leading-tight">{stat.label}</p>
                        <p className={`text-[18px] font-bold tabular-nums leading-none ${stat.urgent ? "text-red-600" : "text-slate-900"}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {industry.actions.map((action, i) => (
                      <div key={i} className={`rounded-[10px] border p-3.5 ${action.type === "draft" ? "border-[#4A3FA8]/20 bg-[#4A3FA8]/[0.04]" : "border-black/[0.06] bg-white"}`}>
                        <p className="text-[12px] text-slate-700 leading-relaxed mb-2.5">{action.text}</p>
                        {action.type === "draft" && action.cta && (
                          <div className="flex gap-2">
                            <div className="rounded-[7px] bg-[#4A3FA8] px-3 py-1.5 text-[11.5px] font-semibold text-white">{action.cta}</div>
                            <div className="rounded-[7px] border border-black/[0.08] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-500">Skip</div>
                          </div>
                        )}
                        {action.type === "alert" && (
                          <div className="rounded-[7px] border border-black/[0.08] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-500 inline-flex">Got it</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations bar */}
      <section className="border-t border-white/[0.06] py-10">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 mb-5">Works with your existing tools</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {integrations.map((name) => (
              <div key={name} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[13px] font-medium text-slate-400">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">How it works</p>
            <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.025em]">Set it up once.<br />Aria handles the rest.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {howItWorks.map((step) => (
              <div key={step.step} className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-7">
                <div className="w-9 h-9 rounded-[10px] bg-[#4A3FA8]/20 flex items-center justify-center text-[12px] font-bold text-[#8B80E0] mb-5">{step.step}</div>
                <p className="text-[17px] font-semibold leading-snug mb-3">{step.title}</p>
                <p className="text-[14px] leading-[1.75] text-slate-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Aria does */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">Meet Aria</p>
              <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.025em] mb-5">The assistant that works while you sleep.</h2>
              <p className="text-[16px] leading-[1.8] text-slate-400 mb-8">
                Every night, Aria reviews your entire business. Customers who haven&apos;t been contacted. Jobs sitting unpaid. Follow-ups that slipped through. Proposals that went quiet.
              </p>
              <p className="text-[16px] leading-[1.8] text-slate-400 mb-10">
                By morning, it&apos;s prepared a briefing with the specific actions that matter most — and drafts the messages to go with them. You review, approve, and move on.
              </p>
              <a href={DEMO_FORM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-[12px] bg-[#4A3FA8] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_8px_28px_rgba(74,63,168,0.4)] hover:bg-[#3D3494] transition-colors active:scale-[0.97]">
                See Aria in action →
              </a>
            </div>
            <div className="space-y-3">
              {[
                { icon: "📬", title: "Outreach drafts", body: "Aria writes follow-up messages for customers who need contact. You approve or skip — nothing sends without your sign-off." },
                { icon: "⚠️", title: "Revenue alerts", body: "Flags unpaid invoices, stalling jobs, and revenue drops before they become problems." },
                { icon: "🔁", title: "Runs every night", body: "The briefing refreshes automatically. You start every morning knowing exactly where things stand." },
                { icon: "🎯", title: "Adapts to your business", body: "Aria learns your patterns. The longer you use it, the better its prioritization gets." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-5">
                  <span className="text-[20px] shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-[14px] font-semibold mb-1">{item.title}</p>
                    <p className="text-[13.5px] leading-[1.65] text-slate-400">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-white/[0.06] py-24" id="pricing">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-lg mx-auto text-center mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">Pricing</p>
            <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.025em] mb-4">One price.<br />Everything included.</h2>
            <p className="text-[16px] text-slate-400 leading-[1.75]">No tiers. No feature gating. No contracts. Pay once to get set up — then $100 a month, cancel any time.</p>
          </div>
          <div className="mx-auto max-w-md rounded-[24px] border border-white/12 bg-white/[0.05] p-10">
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">Setup</p>
                <p className="text-[52px] font-semibold leading-none tabular-nums">$300</p>
                <p className="text-[12.5px] text-slate-400 mt-1.5">one time</p>
              </div>
              <div className="text-center border-l border-white/[0.08] pl-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">Monthly</p>
                <p className="text-[52px] font-semibold leading-none tabular-nums">$100</p>
                <p className="text-[12.5px] text-slate-400 mt-1.5">per month</p>
              </div>
            </div>
            <div className="h-px bg-white/[0.08] mb-7" />
            <ul className="space-y-2.5 mb-8">
              {["Everything — no feature tiers","Aria AI briefings every morning","Customers, pipeline, jobs, sales","Imports + integrations included","Hands-on setup session included","Cancel any time, no contracts"].map((f) => (
                <li key={f} className="flex items-center gap-3 text-[13.5px] text-slate-300">
                  <svg className="w-4 h-4 shrink-0 text-[#7B72D4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <a href={DEMO_FORM_URL} target="_blank" rel="noopener noreferrer" className="block w-full rounded-[12px] bg-[#4A3FA8] px-5 py-3.5 text-center text-[14px] font-semibold text-white shadow-[0_8px_28px_rgba(74,63,168,0.4)] hover:bg-[#3D3494] transition-colors active:scale-[0.97]">
              Book a free demo
            </a>
            <p className="mt-3 text-center text-[12px] text-slate-500">30-minute call. We configure your workspace with your real data.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-[44px] sm:text-[56px] font-semibold leading-[1.05] tracking-[-0.03em] mb-5">
            Five spreadsheets and a<br className="hidden sm:block" /> notebook is not a system.
          </h2>
          <p className="text-[17px] leading-[1.75] text-slate-400 max-w-lg mx-auto mb-10">
            Book a free 30-minute demo. By the end of the call your workspace will be live with your real data.
          </p>
          <a href={DEMO_FORM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-[12px] bg-[#4A3FA8] px-8 py-4 text-[15px] font-semibold text-white shadow-[0_8px_32px_rgba(74,63,168,0.45)] hover:bg-[#3D3494] transition-colors active:scale-[0.97]">
            Book a free demo
          </a>
          <p className="mt-4 text-[12.5px] text-slate-500">$300 setup · $100/month · No contracts</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 text-[13px] text-slate-600 md:flex-row md:items-center md:justify-between">
          <p>© 2026 UnifData. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms</Link>
            <Link href="/docs" className="hover:text-slate-400 transition-colors">Docs</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
