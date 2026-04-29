import Link from "next/link";

const features = [
  {
    title: "Customers",
    description:
      "Keep customer records, notes, addresses, and contact info organized.",
  },
  {
    title: "Pipeline",
    description:
      "Track leads, estimates, sources, value, and next follow-up dates.",
  },
  {
    title: "Operations",
    description:
      "Manage jobs, status, dates, payments, and revenue in one place.",
  },
];

const previewRows = [
  ["Monthly revenue", "$64.8k"],
  ["Open estimates", "$31.5k"],
  ["Follow-ups due", "6"],
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950">
              FO
            </div>
            <span className="font-bold">FrontierOps</span>
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/dashboard"
              className="hidden rounded-full px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-white sm:block"
            >
              Demo
            </Link>

            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Log in
            </Link>

            <Link
              href="/signup"
              className="rounded-full bg-white px-4 py-2 font-semibold text-slate-950 hover:bg-slate-200"
            >
              Sign up
            </Link>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              CRM + operations dashboard for local service businesses
            </div>

            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Run the business from one clean dashboard.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              FrontierOps helps local businesses organize customers, leads,
              jobs, sales, and follow-ups without juggling spreadsheets and
              notes.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-2xl bg-white px-5 py-3 text-center font-bold text-slate-950 hover:bg-slate-200"
              >
                View demo
              </Link>

              <Link
                href="/signup"
                className="rounded-2xl border border-white/15 px-5 py-3 text-center font-bold text-white hover:bg-white/10"
              >
                Create account
              </Link>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-white/10 bg-white/6 p-5"
                >
                  <p className="font-bold">{feature.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-4xl border border-white/10 bg-white/7 p-3 shadow-2xl backdrop-blur">
            <div className="rounded-3xl bg-slate-50 p-5 text-slate-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Demo workspace
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    Arctic Ridge Services
                  </h2>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  Live
                </span>
              </div>

              <div className="mt-6 grid gap-3">
                {previewRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-xl font-black">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-black">AI Business Summary</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Revenue is trending up, but open estimates and overdue
                  follow-ups need attention this week.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
