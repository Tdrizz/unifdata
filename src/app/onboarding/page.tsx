import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
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
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-lg items-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
          <a href="/" className="text-sm font-semibold text-slate-300">
            ← Back to home
          </a>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              FrontierOps
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              Set up your company
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Create your first business workspace. This is where customers,
              leads, jobs, sales, and follow-ups will live.
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
                Industry
              </label>
              <input
                name="industry"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
                placeholder="Excavation, snow removal, landscaping..."
              />
            </div>

            <button className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200">
              Create company workspace
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
            <p className="font-semibold text-white">What happens next?</p>
            <p className="mt-1">
              FrontierOps will create your company workspace and make your user
              account the owner.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}