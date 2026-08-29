import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { LiveDemo } from "@/components/marketing/LiveDemo";
import { DEMO_FORM_URL } from "@/lib/constants";

const howItWorks = [
  {
    step: "01",
    title: "Connect your data",
    body: "Import a spreadsheet or connect Jobber, QuickBooks, HubSpot, or Square. Vera maps your records automatically — customers, jobs, revenue, follow-ups.",
  },
  {
    step: "02",
    title: "Vera learns your business",
    body: "Every night, Vera reviews everything. Stale customers. Unpaid work. Overdue follow-ups. Missed opportunities. It prepares a brief so you don't have to dig.",
  },
  {
    step: "03",
    title: "You make the calls",
    body: "Open the app each morning and see exactly what needs attention. Approve a follow-up, mark a job complete, collect a payment — or reply to a text or email right from the same inbox. Vera does the thinking. You make the decisions.",
  },
];

const integrations = ["QuickBooks", "Jobber", "HubSpot", "Square", "Google Sheets", "CSV"];

export default function HomePage() {
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
              Vera — your AI business assistant
            </div>
            <h1 className="animate-fade-up [animation-delay:60ms] text-[52px] sm:text-[64px] lg:text-[76px] font-semibold leading-[1.02] tracking-[-0.03em] mb-6">
              Your business,<br />briefed every morning.
            </h1>
            <p className="animate-fade-up [animation-delay:120ms] text-[18px] leading-[1.75] text-slate-300 max-w-xl mx-auto mb-10">
              Stop running your business from memory. Vera reviews your customers, jobs, revenue, and follow-ups overnight — and tells you exactly what needs attention when you wake up.
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

      {/* How it works */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">How it works</p>
            <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.025em]">Set it up once.<br />Vera handles the rest.</h2>
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

      {/* What Vera does */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">Meet Vera</p>
              <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.025em] mb-5">The assistant that works while you sleep.</h2>
              <p className="text-[16px] leading-[1.8] text-slate-400 mb-8">
                Every night, Vera reviews your entire business. Customers who haven&apos;t been contacted. Jobs sitting unpaid. Follow-ups that slipped through. Proposals that went quiet.
              </p>
              <p className="text-[16px] leading-[1.8] text-slate-400 mb-10">
                By morning, it&apos;s prepared a briefing with the specific actions that matter most — and drafts the messages to go with them. You review, approve, and move on.
              </p>
              <a href={DEMO_FORM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-[12px] bg-[#4A3FA8] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_8px_28px_rgba(74,63,168,0.4)] hover:bg-[#3D3494] transition-colors active:scale-[0.97]">
                See Vera in action →
              </a>
            </div>
            <div className="space-y-3">
              {[
                { icon: "📬", title: "Outreach drafts", body: "Vera writes follow-up messages for customers who need contact. You approve or skip — nothing sends until you say so, unless you switch on auto-send yourself." },
                { icon: "💬", title: "Texting and email, in one inbox", body: "Every reply — text or email — lands in one thread tied to that customer's record. Nothing gets lost in someone's personal phone." },
                { icon: "⚠️", title: "Revenue alerts", body: "Flags unpaid invoices, stalling jobs, and revenue drops before they become problems." },
                { icon: "🔁", title: "Runs every night", body: "The briefing refreshes automatically. You start every morning knowing exactly where things stand." },
                { icon: "🎯", title: "Adapts to your business", body: "Vera learns your patterns. The longer you use it, the better its prioritization gets." },
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
