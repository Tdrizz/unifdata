import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { businessSectorOptions } from "@/lib/industry-profiles";
import { createCompanyAction } from "./actions";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentCompany = await getCurrentCompany();

  if (currentCompany) {
    redirect("/workspace");
  }

  return (
    <main className="min-h-screen bg-[#090e1a] px-6 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-950">
              FO
            </div>
            <div>
              <p className="font-semibold">FrontierOps</p>
              <p className="text-xs text-slate-400">Workspace setup</p>
            </div>
          </Link>

          <div className="mt-12">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Build around the business
            </p>

            <h1 className="mt-4 text-5xl font-semibold leading-tight tracking-tight">
              Choose the sector so the workspace knows what matters.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
              A medical office, contractor, home services crew, and
              professional services firm should not operate from the same
              generic workspace.
            </p>
          </div>
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/7 p-8 shadow-2xl backdrop-blur">
          <Link href="/" className="text-sm font-medium text-slate-300">
            ← Back to home
          </Link>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Company setup
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Create your workspace
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              This creates the company workspace and sets the dashboard language
              for the business.
            </p>
          </div>

          <form action={createCompanyAction} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-200">
                Company name
              </label>
              <input
                name="companyName"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
                placeholder="Arctic Ridge Services"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-200">
                Business sector
              </label>
              <select
                name="businessSector"
                defaultValue="general"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
              >
                {businessSectorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                This controls the language and priorities shown in dashboards.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-200">
                Industry description
              </label>
              <input
                name="industry"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
                placeholder="Excavation, dental office, landscaping, accounting, IT services..."
              />
            </div>

            <button className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200">
              Create company workspace
            </button>
          </form>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-slate-300">
            <p className="font-semibold text-white">What changes by sector?</p>
            <p className="mt-1">
              Relationships become patients, clients, or customers.
              Opportunities become treatment plans, quotes, estimates, or
              proposals — and the dashboard, navigation, and reports follow the
              same language throughout.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
