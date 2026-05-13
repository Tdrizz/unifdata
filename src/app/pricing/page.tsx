import Link from "next/link";
import { ProductMark } from "@/components/ProductMark";

const tiers = [
  {
    name: "Starter",
    price: "$49",
    description: "For solo operators getting organized.",
    features: [
      "Up to 500 customer records",
      "Leads, jobs, and sales tracking",
      "Follow-up scheduling",
      "CSV import",
      "1 workspace",
      "Email support",
    ],
    cta: "Start free trial",
    href: "/signup?plan=starter",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$99",
    description: "For growing businesses managing a real pipeline.",
    features: [
      "Up to 5,000 customer records",
      "Everything in Starter",
      "Data integrations (QuickBooks, Square, Jobber)",
      "Priority data health reporting",
      "Custom branding & colors",
      "Priority email support",
    ],
    cta: "Start free trial",
    href: "/signup?plan=growth",
    highlight: true,
  },
  {
    name: "Business",
    price: "$149",
    description: "For established operations with complex data needs.",
    features: [
      "Unlimited customer records",
      "Everything in Growth",
      "HubSpot & Jobber two-way sync",
      "Team members (up to 5 seats)",
      "Advanced import & deduplication",
      "Dedicated onboarding call",
    ],
    cta: "Start free trial",
    href: "/signup?plan=business",
    highlight: false,
  },
];

const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes — all plans include a 14-day free trial. No credit card required to start.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes, you can upgrade or downgrade at any time. Changes take effect at your next billing cycle.",
  },
  {
    q: "What counts as a customer record?",
    a: "Each unique person or company in your Customers directory counts as one record. Leads, jobs, and sales do not count toward the limit.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Annual plans are available at 2 months free (equivalent to ~17% off). Contact us to switch.",
  },
  {
    q: "What integrations are included?",
    a: "Growth and Business plans include QuickBooks, Square, Jobber, and HubSpot data sync. CSV import is available on all plans.",
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
            href="/login"
            className="rounded-full px-4 py-2 font-medium text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-white px-4 py-2 font-semibold text-slate-950 hover:bg-slate-200"
          >
            Start free trial
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 pb-10 pt-16 text-center">
        <div className="inline-flex rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-slate-300">
          Simple, transparent pricing
        </div>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
          One price. One workspace.
          <br />
          No surprises.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          FrontierOps grows with your business. Start on any plan and switch as
          your needs change. All plans include a 14-day free trial.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-4xl border p-8 ${
                tier.highlight
                  ? "border-white/30 bg-white/10 shadow-2xl"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-slate-950">
                    Most popular
                  </span>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                  {tier.name}
                </p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-5xl font-semibold">{tier.price}</span>
                  <span className="mb-1.5 text-slate-400">/month</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {tier.description}
                </p>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
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
                <Link
                  href={tier.href}
                  className={`block rounded-2xl px-5 py-3 text-center font-semibold transition-colors ${
                    tier.highlight
                      ? "bg-white text-slate-950 hover:bg-slate-200"
                      : "border border-white/20 text-white hover:bg-white/10"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          All prices in USD. Cancel any time during your trial — no charge.
        </p>
      </section>

      <section className="border-t border-white/10 bg-white/3 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            What&apos;s included in every plan
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Industry-aware workspace",
                description:
                  "The dashboard adapts its language and priorities to your business type.",
              },
              {
                title: "Data health scoring",
                description:
                  "See which records are missing key info before it costs you a deal.",
              },
              {
                title: "Follow-up scheduling",
                description:
                  "Track every follow-up and see overdue actions on your daily priority queue.",
              },
              {
                title: "Revenue tracking",
                description:
                  "Log sales, see open quote value, and monitor unpaid work.",
              },
              {
                title: "CSV import",
                description:
                  "Bring in existing customers, jobs, and leads from spreadsheets in minutes.",
              },
              {
                title: "Secure data handling",
                description:
                  "Row-level security ensures your data is isolated and only you can see it.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-5"
              >
                <p className="font-semibold">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {item.description}
                </p>
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
            Start your 14-day free trial — no credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 hover:bg-slate-200"
            >
              Start free trial
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
          <p>© 2026 FrontierOps. All rights reserved.</p>
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
