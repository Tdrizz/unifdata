import Link from "next/link";

const previewMetrics = [
  { label: "Monthly Revenue", value: "$64.8k" },
  { label: "Open Estimates", value: "$31.5k" },
  { label: "Follow-Ups Due", value: "6" },
];

const recentItems = [
  {
    name: "Mike Johnson",
    detail: "Driveway gravel repair",
    value: "$3,500",
    status: "Follow up",
  },
  {
    name: "Arctic Rentals LLC",
    detail: "Lot clearing estimate",
    value: "$7,800",
    status: "Estimate sent",
  },
  {
    name: "Northline Storage",
    detail: "Snow removal contract",
    value: "$2,800",
    status: "New lead",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6">
        <nav className="flex items-center justify-between">
  <a href="/" className="text-lg font-bold tracking-tight">
    FrontierOps
  </a>

  <div className="flex items-center gap-3 text-sm">
    <a
      href="/dashboard"
      className="hidden rounded-full px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-white sm:block"
    >
      Demo
    </a>

    <a
      href="/login"
      className="rounded-full px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-white"
    >
      Log in
    </a>

    <a
      href="/signup"
      className="rounded-full border border-white/15 px-4 py-2 text-slate-200 hover:bg-white/10"
    >
      Sign up
    </a>
  </div>
</nav>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1fr_520px]">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              No More Messy Data.
            </div>

            <h1 className="text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Your business data, finally in one place.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              FrontierOps helps businesses track customers, leads, jobs, sales,
              revenue, and follow-ups from one clean cloud dashboard.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-xl bg-white px-5 py-3 text-center font-semibold text-slate-950 hover:bg-slate-200"
              >
                View Demo Dashboard
              </Link>

              <Link
                href="/login"
                className="rounded-xl border border-white/15 px-5 py-3 text-center font-semibold text-white hover:bg-white/10"
              >
                Log In
              </Link>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-2xl font-bold">$64.8k</p>
                <p className="mt-1 text-xs text-slate-400">Revenue tracked</p>
              </div>

              <div>
                <p className="text-2xl font-bold">28</p>
                <p className="mt-1 text-xs text-slate-400">New leads</p>
              </div>

              <div>
                <p className="text-2xl font-bold">6</p>
                <p className="mt-1 text-xs text-slate-400">Follow-ups due</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur">
            <div className="rounded-2xl bg-slate-50 p-5 text-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Demo Company
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    Arctic Ridge Services
                  </h2>
                </div>

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Live
                </span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {previewMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs text-slate-500">{metric.label}</p>
                    <p className="mt-2 text-xl font-bold">{metric.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">AI Business Summary</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    This month
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Revenue is trending up, but $31,500 in open estimates still
                  need follow-up. Contact the highest-value leads before Friday.
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-4">
                  <h3 className="font-bold">Recent Opportunities</h3>
                </div>

                <div className="divide-y divide-slate-100">
                  {recentItems.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-slate-500">{item.detail}</p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold">{item.value}</p>
                        <p className="text-xs text-slate-500">{item.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
