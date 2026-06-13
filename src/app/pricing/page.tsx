import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";

const DEMO_FORM_URL = "DEMO_FORM_URL"; // TODO: Replace with Malachi's Google Form URL before launch

export const metadata: Metadata = {
  title: "Pricing — UnifData",
  description: "One setup fee, one flat monthly rate. No tiers, no feature gating, no contracts.",
};

const included = [
  "Everything — no feature tiers or upgrade walls",
  "Aria AI briefings every morning",
  "Customers, pipeline, jobs, sales, and follow-ups",
  "CSV imports with smart deduplication",
  "QuickBooks, Jobber, HubSpot, and Square sync",
  "Data health scoring and cleanup tools",
  "Hands-on setup session with your real data",
  "Cancel any time — no contract",
];

const faqs = [
  {
    q: "What's included in the $300 setup fee?",
    a: "A hands-on onboarding session where we configure your workspace, import your existing data, connect your integrations, and walk you through the app with your real customers and jobs. You're not left to figure it out yourself.",
  },
  {
    q: "When do I get charged?",
    a: "The $300 setup fee is charged once after the demo call if you decide to move forward. Your first $100 monthly payment starts 30 days after your workspace goes live.",
  },
  {
    q: "Is there a free trial?",
    a: "Instead of a free trial on empty data, we offer a free demo call where we build your workspace live with your real data. Most people get more value from 30 minutes of that than a week of poking around an empty workspace.",
  },
  {
    q: "Can I cancel the monthly subscription?",
    a: "Yes — cancel any time from your settings. Your workspace stays active until the end of the billing period you've already paid for.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "You can export everything as a CSV before cancelling. We retain your data for 30 days after cancellation in case you change your mind.",
  },
  {
    q: "Is there a contract or long-term commitment?",
    a: "No contract. Month to month. You own your data.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#090e1a] text-white antialiased">
      <PublicNav active="pricing" />

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">Pricing</p>
        <h1 className="text-[52px] sm:text-[64px] font-semibold leading-[1.05] tracking-[-0.03em] mb-5">One price.<br />Everything included.</h1>
        <p className="mx-auto max-w-lg text-[17px] leading-[1.75] text-slate-400">No tiers. No feature gating. No contracts. Pay once to get set up — then $100 a month, cancel any time.</p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mx-auto max-w-lg rounded-[24px] border border-white/12 bg-white/[0.05] p-10 shadow-[0_32px_80px_rgba(0,0,0,0.4)]">
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">Setup</p>
              <p className="text-[60px] font-semibold leading-none tabular-nums">$300</p>
              <p className="text-[13px] text-slate-400 mt-2">one time</p>
            </div>
            <div className="text-center border-l border-white/[0.08] pl-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">Monthly</p>
              <p className="text-[60px] font-semibold leading-none tabular-nums">$100</p>
              <p className="text-[13px] text-slate-400 mt-2">per month</p>
            </div>
          </div>
          <div className="h-px bg-white/[0.08] mb-8" />
          <ul className="space-y-3 mb-9">
            {included.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[14px] text-slate-300">
                <svg className="w-4 h-4 shrink-0 mt-[2px] text-[#7B72D4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                {f}
              </li>
            ))}
          </ul>
          <a href={DEMO_FORM_URL} target="_blank" rel="noopener noreferrer" className="block w-full rounded-[12px] bg-[#4A3FA8] px-5 py-3.5 text-center text-[15px] font-semibold text-white shadow-[0_8px_28px_rgba(74,63,168,0.4)] hover:bg-[#3D3494] transition-colors active:scale-[0.97]">
            Book a free demo
          </a>
          <p className="mt-3 text-center text-[12.5px] text-slate-500">30-minute call. We set up your workspace with your real data.</p>
        </div>
      </section>

      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">What you get</p>
            <h2 className="text-[36px] font-semibold leading-[1.15] tracking-[-0.025em]">The setup session isn&apos;t optional — it&apos;s the product.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { step: "01", title: "Before the call", body: "Export a spreadsheet of your customers, jobs, or contacts from wherever you're storing them now. We handle the rest." },
              { step: "02", title: "During the call", body: "We configure your workspace, import your data, connect your tools, and walk you through the app with your real customers and jobs." },
              { step: "03", title: "After the call", body: "You're running on UnifData. Aria starts reviewing your business that night and your first briefing is ready the next morning." },
            ].map((step) => (
              <div key={step.step} className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-7">
                <div className="w-8 h-8 rounded-[9px] bg-[#4A3FA8]/20 flex items-center justify-center text-[12px] font-bold text-[#8B80E0] mb-5">{step.step}</div>
                <p className="text-[17px] font-semibold mb-2.5">{step.title}</p>
                <p className="text-[14px] leading-[1.75] text-slate-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">FAQ</p>
            <h2 className="text-[36px] font-semibold leading-[1.15] tracking-[-0.025em]">Common questions</h2>
          </div>
          <div className="max-w-2xl space-y-0 divide-y divide-white/[0.07]">
            {faqs.map((faq) => (
              <div key={faq.q} className="py-6">
                <p className="text-[15px] font-semibold mb-2">{faq.q}</p>
                <p className="text-[14px] leading-[1.75] text-slate-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.025em] mb-5">Ready to see it with your data?</h2>
          <p className="text-[16px] text-slate-400 max-w-md mx-auto mb-10">Book a free 30-minute demo. By the end of the call your workspace will be live.</p>
          <a href={DEMO_FORM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-[12px] bg-[#4A3FA8] px-8 py-4 text-[15px] font-semibold text-white shadow-[0_8px_32px_rgba(74,63,168,0.45)] hover:bg-[#3D3494] transition-colors active:scale-[0.97]">
            Book a free demo
          </a>
          <p className="mt-4 text-[12.5px] text-slate-500">$300 setup · $100/month · No contracts</p>
        </div>
      </section>

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
