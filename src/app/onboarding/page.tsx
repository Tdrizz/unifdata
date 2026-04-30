import { redirect } from "next/navigation";
import Link from "next/link";
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
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl items-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
          <Link href="/" className="text-sm font-semibold text-slate-300">
            ← Back to home
          </Link>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              FrontierOps
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Set up your company
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Create your business workspace and choose the sector that best
              matches how your company operates.
            </p>
          </div>

          <form action={createCompanyAction} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-200">
                Company name
              </label>
              <input
                name="companyName"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
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
                className="mt-2 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
              >
                {businessSectorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                This controls the language and priorities shown in your
                dashboards.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-200">
                Industry description
              </label>
              <input
                name="industry"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
                placeholder="Excavation, dental office, landscaping, IT services..."
              />
            </div>

            <button className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200">
              Create company workspace
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
            <p className="font-semibold text-white">Why this matters</p>
            <p className="mt-1">
              A contractor, dental office, and professional service firm all
              care about different numbers. FrontierOps will use this sector to
              make the dashboard more relevant.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
