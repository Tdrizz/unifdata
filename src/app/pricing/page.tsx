import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { CheckoutButton } from "@/components/pricing/CheckoutButton";

export const metadata: Metadata = {
  title: "Pricing",
  description: "UnifData pricing — one setup fee, one flat monthly rate. No tiers, no contracts.",
};

const features = [
  "Industry-aware CRM workspace",
  "Customers, leads, jobs, sales & follow-ups",
  "Daily priority queue & follow-up scheduling",
  "Data health scoring & cleanup tools",
  "CSV import with smart deduplication",
  "QuickBooks, Square, Jobber, HubSpot sync",
  "AI-generated operating briefs",
  "Secure, isolated company workspace",
];

const faqs = [
  {
    q: "What's included in the $300 setup fee?",
    a: "A hands-on onboarding session where we configure your workspace, import your existing data, set up your industry profile, and make sure your team is ready to use UnifData on day one.",
  },
  {
    q: "When do I get charged?",
    a: "The $300 setup fee is charged once at signup. Your first monthly payment of $100 starts 30 days after your workspace goes live.",
  },
  {
    q: "Can I cancel the monthly subscription?",
    a: "Yes — cancel any time. Your workspace stays active until the end of the billing period you've already paid for.",
  },
  {
    q: "Is there a contract or commitment?",
    a: "No long-term contract. Month to month after the initial setup. You own your data and can export it any time.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "You can export everything as a CSV before cancelling. We retain your data for 30 days after cancellation in case you change your mind.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#090e1a] text-white">
      <PublicNav dark active="pricing" />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-10 pt-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4A3FA8]" />
          Simple, transparent pricing
        </div>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
          One price.<br />Everything included.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[17px] leading-8 text-slate-300">
          No tiers, no feature gating, no surprises. Pay once to get set up,
          then a flat monthly rate — that&apos;s it.
        </p>
      </section>

      {/* Pricing card */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mx-auto max-w-lg">
          <div className="rounded-[28px] border border-white/15 bg-white/6 p-10 shadow-2xl">
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  One-time setup
                </p>
                <div className="mt-4 flex items-end justify-center gap-1">
                  <span className="text-[60px] font-semibold leading-none">$300</span>
                </div>
                <p className="mt-2 text-[13px] text-slate-300">
                  Paid once — covers onboarding &amp; data setup
                </p>
              </div>
              <div className="text-center sm:border-l sm:border-white/10 sm:pl-8">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Then monthly
                </p>
                <div className="mt-4 flex items-end justify-center gap-1">
                  <span className="text-[60px] font-semibold leading-none">$100</span>
                  <span className="mb-2 text-slate-400">/mo</span>
                </div>
                <p className="mt-2 text-[13px] text-slate-300">
                  Cancel any time — no contracts
                </p>
              </div>
            </div>

            <div className="my-8 h-px bg-white/10" />

            <ul className="grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-[13px]">
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
                  <span className="text-slate-200">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <CheckoutButton />
              <p className="mt-3 text-center text-[12px] text-slate-500">
                Invited users can subscribe immediately. New companies should
                request beta access first.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Setup fee", value: "$300 once" },
              { label: "Monthly", value: "$100 / mo" },
              { label: "Contract", value: "None" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-[14px] border border-white/10 bg-white/5 px-4 py-3"
              >
                <p className="text-[14px] font-semibold">{value}</p>
                <p className="mt-1 text-[12px] text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/8 px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-[30px] font-semibold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="mt-10 divide-y divide-white/8">
            {faqs.map((faq) => (
              <div key={faq.q} className="py-6">
                <p className="text-[14.5px] font-semibold">{faq.q}</p>
                <p className="mt-2 text-[13.5px] leading-7 text-slate-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/8 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[30px] font-semibold tracking-tight">
            Ready to get organized?
          </h2>
          <p className="mt-3 text-slate-300">
            One setup fee. One flat monthly rate. Everything included.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/waitlist"
              className="rounded-xl bg-[#4A3FA8] px-6 py-3 font-semibold text-white shadow-[0_8px_28px_rgba(74,63,168,0.40)] hover:bg-[#3D3494]"
            >
              Get started
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-slate-200 hover:bg-white/8"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-[13px] text-slate-500 md:flex-row md:items-center md:justify-between">
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
