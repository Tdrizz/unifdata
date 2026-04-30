import Link from "next/link";
import { ProductMark } from "@/components/ProductMark";

const demoSectors = [
  {
    sector: "Landscaping",
    focus: "Open quotes, recurring services, unpaid jobs, customer follow-ups",
    metrics: [
      ["Open quote value", "$12,400"],
      ["Active service jobs", "7"],
      ["Unpaid work", "$3,850"],
      ["Data health", "84%"],
    ],
    insights: [
      "Yard cleanups are creating the most customer interest.",
      "Mowing is producing the most repeat revenue.",
      "Three customer records are missing contact details.",
    ],
  },
  {
    sector: "Dental Office",
    focus:
      "New patient inquiries, appointments, treatment follow-ups, collections",
    metrics: [
      ["Open inquiry value", "$8,200"],
      ["Appointments", "18"],
      ["Outstanding balances", "$4,100"],
      ["Data health", "91%"],
    ],
    insights: [
      "Recall follow-ups are the highest priority today.",
      "New patient inquiries are converting from Google.",
      "Most patient records have usable contact details.",
    ],
  },
  {
    sector: "Insurance Agency",
    focus:
      "Prospects, renewals, policy follow-ups, commissions, client records",
    metrics: [
      ["Open prospect value", "$6,700"],
      ["Renewals due", "9"],
      ["Unpaid commissions", "$1,250"],
      ["Data health", "79%"],
    ],
    insights: [
      "Renewal follow-ups should be handled before Friday.",
      "Referral leads are converting better than paid ads.",
      "Several policies are missing source tracking.",
    ],
  },
];

export default function DemoDashboardPage() {
  return (
    <main className="min-h-screen bg-[#eef2f7] text-slate-950">
      <section className="mx-auto max-w-7xl px-6 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/">
            <ProductMark companyName="Public demo" />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Home
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Start
            </Link>
          </div>
        </nav>

        <div className="mt-12 rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Demo
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              One operating system. Different business models.
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-600">
              FrontierOps adapts the dashboard language and metrics to the type
              of company using it. A dental office, insurance agency,
              dealership, contractor, and service business should not all
              operate from the same generic dashboard.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          {demoSectors.map((demo) => (
            <section
              key={demo.sector}
              className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Industry workspace
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                      {demo.sector}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                      {demo.focus}
                    </p>
                  </div>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    Tailored
                  </span>
                </div>
              </div>

              <div className="grid gap-0 xl:grid-cols-[0.85fr_1.15fr]">
                <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 xl:border-r xl:divide-y">
                  {demo.metrics.map(([label, value]) => (
                    <div key={label} className="p-5">
                      <p className="text-xs font-medium text-slate-500">
                        {label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="p-6">
                  <p className="font-semibold">What the owner sees today</p>
                  <div className="mt-4 grid gap-3">
                    {demo.insights.map((insight) => (
                      <div
                        key={insight}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
                      >
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="my-10 rounded-4xl bg-slate-950 p-8 text-white">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Ready to turn a messy business into a clean workspace?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                Create a company, choose the business sector, and start building
                the CRM and data layer around what actually matters.
              </p>
            </div>

            <Link
              href="/signup"
              className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-slate-200"
            >
              Create workspace
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
