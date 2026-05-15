import Link from "next/link";
import { ProductMark } from "@/components/ProductMark";
import { CheckoutButton } from "@/components/pricing/CheckoutButton";

const features = [
  "Industry-aware CRM workspace",
  "Customers, leads, jobs, sales & follow-ups",
  "Daily priority queue & follow-up scheduling",
  "Data health scoring & cleanup tools",
  "CSV import with smart deduplication",
  "QuickBooks, Square, Jobber, HubSpot sync",
  "Custom branding & colors",
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
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/">
          <ProductMark inverse />
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/sign-in"
            className="rounded-full px-4 py-2 font-medium text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/waitlist"
            className="rounded-full bg-white px-4 py-2 font-semibold text-slate-950 hover:bg-slate-200"
          >
            Request access
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 pb-10 pt-16 text-center">
        <div className="inline-flex rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-slate-300">
          Simple, transparent pricing
        </div>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
          One price.
          <br />
          Everything included.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-300">
          No tiers, no feature gating, no surprises. Pay once to get set up,
          then a flat monthly rate — that&apos;s it.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mx-auto max-w-lg">
          <div className="rounded-4xl border border-white/20 bg-white/8 p-10 shadow-2xl">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-300">
                One-time setup
              </div>
              <div className="mt-5 flex items-end justify-center gap-2">
                <span className="text-7xl font-semibold">$300</span>
              </div>
              <p className="mt-2 text-slate-300">
                Paid once — covers onboarding & data setup
              </p>
            </div>

            <div className="my-8 h-px bg-white/10" />

            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-300">
                Then monthly
              </div>
              <div className="mt-5 flex items-end justify-center gap-2">
                <span className="text-7xl font-semibold">$100</span>
                <span className="mb-2 text-slate-400">/month</span>
              </div>
              <p className="mt-2 text-slate-300">
                Cancel any time — no contracts
              </p>
            </div>

            <div className="my-8 h-px bg-white/10" />

            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm">
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
              <p className="mt-3 text-center text-xs text-slate-500">
                Invited users can subscribe immediately. New companies should
                request beta access first.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
            {[
              { label: "Setup fee", value: "$300 once" },
              { label: "Monthly", value: "$100 / mo" },
              { label: "Contract", value: "None" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <p className="font-semibold">{value}</p>
                <p className="mt-1 text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-b border-white/10 pb-6">
                <p className="font-semibold">{faq.q}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/3 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Ready to get organized?
          </h2>
          <p className="mt-3 text-slate-300">
            One setup fee. One flat monthly rate. Everything included.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/waitlist"
              className="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 hover:bg-slate-200"
            >
              Request access
            </Link>
            <Link
              href="/"
              className="rounded-2xl border border-white/15 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 UnifData. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="font-semibold hover:text-slate-950">
              Privacy
            </Link>
            <Link href="/terms" className="font-semibold hover:text-slate-950">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
