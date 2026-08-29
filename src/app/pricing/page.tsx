import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { DEMO_FORM_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pricing — UnifData",
  description: "One flat monthly rate, no setup fee. No tiers, no feature gating, no contracts.",
};

const included = [
  "Everything — no feature tiers or upgrade walls",
  "Vera AI briefings every morning",
  "Customers, pipeline, jobs, sales, and follow-ups",
  "CSV imports with smart deduplication",
  "QuickBooks, Jobber, HubSpot, and Square sync",
  "Data health scoring and cleanup tools",
  "Hands-on setup session with your real data",
  "Cancel any time — no contract",
];

const faqs = [
  {
    q: "What happens on the setup call?",
    a: "A hands-on onboarding session where we configure your workspace, import your existing data, connect your integrations, and walk you through the app with your real customers and jobs. It's free — you're not left to figure it out yourself, and there's no separate fee for it.",
  },
  {
    q: "When do I get charged?",
    a: "Nothing on the demo call itself. Your first $100 monthly payment starts 30 days after your workspace goes live.",
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
    <main className="min-h-screen bg-ud-page text-ud-ink antialiased">
      <PublicNav active="pricing" />

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ud-muted mb-4">Pricing</p>
        <h1 className="text-[44px] sm:text-[54px] font-semibold leading-[1.1] tracking-[-0.03em] mb-5 text-ud-ink">One price.<br />Everything included.</h1>
        <p className="mx-auto max-w-lg text-[17px] leading-[1.75] text-ud-muted">No tiers. No feature gating. No contracts. No setup fee — just $100 a month, cancel any time.</p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mx-auto max-w-lg rounded-[18px] border border-ud bg-ud-surface shadow-ud p-6 sm:p-10">
          <div className="text-center mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ud-muted mb-3">Monthly</p>
            <p className="text-[52px] sm:text-[64px] font-semibold leading-none tabular-nums text-ud-ink">$100</p>
            <p className="text-[13px] text-ud-muted mt-2">per month · no setup fee</p>
          </div>
          <div className="h-px bg-ud mb-8" />
          <ul className="space-y-3 mb-9">
            {included.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[14px] text-ud-text">
                <svg className="w-4 h-4 shrink-0 mt-[2px] text-ud-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                {f}
              </li>
            ))}
          </ul>
          <a href={DEMO_FORM_URL} target="_blank" rel="noopener noreferrer" className="block w-full rounded-[10px] bg-ud-ink px-5 py-3.5 text-center text-[15px] font-semibold text-white hover:opacity-85 transition-opacity active:scale-[0.97]">
            Book a free demo
          </a>
          <p className="mt-3 text-center text-[12.5px] text-ud-muted">30-minute call. We set up your workspace with your real data.</p>
        </div>
      </section>

      <section className="border-t border-ud py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ud-muted mb-3">What you get</p>
            <h2 className="text-[32px] font-semibold leading-[1.2] tracking-[-0.025em] text-ud-ink">The setup session isn&apos;t optional — it&apos;s the product.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { step: "01", title: "Before the call", body: "Export a spreadsheet of your customers, jobs, or contacts from wherever you're storing them now. We handle the rest." },
              { step: "02", title: "During the call", body: "We configure your workspace, import your data, connect your tools, and walk you through the app with your real customers and jobs." },
              { step: "03", title: "After the call", body: "You're running on UnifData. Vera starts reviewing your business that night and your first briefing is ready the next morning." },
            ].map((step) => (
              <div key={step.step} className="rounded-[14px] border border-ud bg-ud-surface shadow-ud p-7">
                <div className="w-8 h-8 rounded-[9px] bg-ud-surface-sunk flex items-center justify-center text-[12px] font-bold text-ud-muted mb-5">{step.step}</div>
                <p className="text-[16px] font-semibold mb-2.5 text-ud-ink">{step.title}</p>
                <p className="text-[14px] leading-[1.75] text-ud-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ud py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ud-muted mb-3">FAQ</p>
            <h2 className="text-[32px] font-semibold leading-[1.2] tracking-[-0.025em] text-ud-ink">Common questions</h2>
          </div>
          <div className="max-w-2xl space-y-0 divide-y divide-ud">
            {faqs.map((faq) => (
              <div key={faq.q} className="py-6">
                <p className="text-[15px] font-semibold mb-2 text-ud-ink">{faq.q}</p>
                <p className="text-[14px] leading-[1.75] text-ud-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ud py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-[34px] sm:text-[40px] font-semibold leading-[1.15] tracking-[-0.025em] mb-5 text-ud-ink">Ready to see it with your data?</h2>
          <p className="text-[16px] text-ud-muted max-w-md mx-auto mb-10">Book a free 30-minute demo. By the end of the call your workspace will be live.</p>
          <a href={DEMO_FORM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-[10px] bg-ud-ink px-8 py-4 text-[15px] font-semibold text-white hover:opacity-85 transition-opacity active:scale-[0.97]">
            Book a free demo
          </a>
          <p className="mt-4 text-[12.5px] text-ud-muted">$100/month · No setup fee · No contracts</p>
        </div>
      </section>

      <footer className="border-t border-ud py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 text-[13px] text-ud-muted md:flex-row md:items-center md:justify-between">
          <p>© 2026 UnifData. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-ud-ink transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-ud-ink transition-colors">Terms</Link>
            <Link href="/docs" className="hover:text-ud-ink transition-colors">Docs</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
