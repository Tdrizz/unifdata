import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { LiveDemo } from "@/components/marketing/LiveDemo";
import { DEMO_FORM_URL } from "@/lib/constants";

const howItWorks = [
  {
    step: "01",
    title: "Connect your data",
    body: "Import a spreadsheet or connect Jobber, QuickBooks, HubSpot, or Square. Everything maps automatically — customers, jobs, revenue, follow-ups.",
  },
  {
    step: "02",
    title: "Everything stays in sync",
    body: "Customers, jobs, and invoices update automatically as work happens — from your integrations, your team, or a CSV import. No more re-typing the same thing into three different tools.",
  },
  {
    step: "03",
    title: "You make the calls",
    body: "See exactly what needs attention, update a job, collect a payment, or reply to a text or email — all from the same place. Vera flags what's urgent so nothing slips through.",
  },
];

const capabilities = [
  {
    icon: "kanban" as const,
    title: "Customers & pipeline",
    body: "Every lead, quote, and job tied to the right customer record — searchable, always current, never a stale spreadsheet.",
  },
  {
    icon: "dollar" as const,
    title: "Revenue & invoicing",
    body: "See what's paid, what's owed, and what's stalling — in real numbers pulled from your actual jobs, not guesses.",
  },
  {
    icon: "chat" as const,
    title: "Communications",
    body: "Texts and emails land in one inbox, tied to the customer's record. Nothing gets lost in someone's personal phone.",
  },
  {
    icon: "plug" as const,
    title: "Integrations",
    body: "Connect QuickBooks, Jobber, HubSpot, and Square in a few clicks. No CSV exports, no double entry.",
  },
];

const integrations = ["QuickBooks", "Jobber", "HubSpot", "Square", "Google Sheets", "CSV"];

function CapabilityIcon({ icon }: { icon: "kanban" | "dollar" | "chat" | "plug" }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "#8B80E0", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (icon === "kanban") return <svg {...common}><rect x="3" y="3" width="5" height="18" rx="1" /><rect x="9.5" y="3" width="5" height="18" rx="1" /><rect x="16" y="3" width="5" height="18" rx="1" /></svg>;
  if (icon === "dollar") return <svg {...common}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
  if (icon === "chat") return <svg {...common}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>;
  return <svg {...common}><path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M18 8v3a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" /></svg>;
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#090e1a] text-white antialiased">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[560px] w-[820px] rounded-full bg-[#2f3a52] opacity-[0.35] blur-[160px]" />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[12.5px] font-medium text-slate-400 mb-8">
              For home services, construction & professional services
            </div>
            <h1 className="animate-fade-up [animation-delay:60ms] text-[52px] sm:text-[64px] lg:text-[76px] font-semibold leading-[1.02] tracking-[-0.03em] mb-6">
              One system for your<br />customers, jobs, and revenue.
            </h1>
            <p className="animate-fade-up [animation-delay:120ms] text-[18px] leading-[1.75] text-slate-300 max-w-xl mx-auto mb-10">
              Stop juggling spreadsheets, texts, and three different apps. UnifData brings your customers, jobs, invoices, and messages into one place — with Vera, an AI assistant that flags what needs your attention.
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
              $100/month · No setup fee · No contracts
            </p>
          </div>

          {/* Live, looping product demo — real UI, no video file */}
          <div className="mt-16 animate-fade-up [animation-delay:300ms]">
            <LiveDemo />
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

      {/* Everything in one place */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">The product</p>
            <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.025em]">Everything in one place.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {capabilities.map((c) => (
              <div key={c.title} className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-7">
                <div className="w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center mb-5">
                  <CapabilityIcon icon={c.icon} />
                </div>
                <p className="text-[17px] font-semibold leading-snug mb-2.5">{c.title}</p>
                <p className="text-[14px] leading-[1.75] text-slate-400">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">How it works</p>
            <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.025em]">Set it up once.<br />It runs itself from there.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {howItWorks.map((step) => (
              <div key={step.step} className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-7">
                <div className="w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center text-[12px] font-bold text-slate-300 mb-5">{step.step}</div>
                <p className="text-[17px] font-semibold leading-snug mb-3">{step.title}</p>
                <p className="text-[14px] leading-[1.75] text-slate-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Vera — a feature, not the whole pitch */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-8 sm:p-12">
            <div className="flex items-start gap-5">
              <div className="w-11 h-11 rounded-[12px] bg-[#4A3FA8]/20 flex items-center justify-center shrink-0">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#8B80E0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Included with every plan</p>
                <h2 className="text-[28px] sm:text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] mb-4">Meet Vera, your AI assistant.</h2>
                <p className="text-[15px] leading-[1.8] text-slate-400 mb-7 max-w-xl">
                  Every night, Vera reviews your business and flags what actually needs attention — stale customers, unpaid work, follow-ups that slipped. No dashboards to dig through, no reports to run.
                </p>
                <ul className="grid gap-3 sm:grid-cols-3 mb-7">
                  {["Flags what needs attention each morning", "Drafts follow-ups you approve before they send", "Learns your patterns the longer you use it"].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] leading-[1.6] text-slate-300">
                      <svg className="w-4 h-4 shrink-0 mt-[2px] text-[#8B80E0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={DEMO_FORM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex text-[14px] font-semibold text-[#8B80E0] hover:text-[#a89de8] transition-colors">
                  See Vera in action →
                </a>
              </div>
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
            <p className="text-[16px] text-slate-400 leading-[1.75]">No tiers. No feature gating. No contracts. No setup fee — just $100 a month, cancel any time.</p>
          </div>
          <div className="mx-auto max-w-md rounded-[24px] border border-white/12 bg-white/[0.05] p-10">
            <div className="text-center mb-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">Monthly</p>
              <p className="text-[64px] font-semibold leading-none tabular-nums">$100</p>
              <p className="text-[12.5px] text-slate-400 mt-2">per month · no setup fee</p>
            </div>
            <div className="h-px bg-white/[0.08] mb-7" />
            <ul className="space-y-2.5 mb-8">
              {["Everything — no feature tiers","Vera AI briefings every morning","Customers, pipeline, jobs, sales","Imports + integrations included","Hands-on setup session included","Cancel any time, no contracts"].map((f) => (
                <li key={f} className="flex items-center gap-3 text-[13.5px] text-slate-300">
                  <svg className="w-4 h-4 shrink-0 text-[#7B72D4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <a href={DEMO_FORM_URL} target="_blank" rel="noopener noreferrer" className="block w-full rounded-[12px] bg-[#4A3FA8] px-5 py-3.5 text-center text-[14px] font-semibold text-white shadow-[0_8px_28px_rgba(74,63,168,0.4)] hover:bg-[#3D3494] transition-colors active:scale-[0.97]">
              Book a free demo
            </a>
            <p className="mt-3 text-center text-[12px] text-slate-500">30-minute call. We set up your workspace with your real data.</p>
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
          <p className="mt-4 text-[12.5px] text-slate-500">$100/month · No setup fee · No contracts</p>
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
