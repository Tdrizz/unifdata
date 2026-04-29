import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { AppShell } from "@/components/AppShell";

export default async function WorkspacePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentCompany = await getCurrentCompany();

  if (!currentCompany) {
    redirect("/onboarding");
  }

  const { company, role } = currentCompany;

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""}>
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Workspace
          </p>

          <h1 className="mt-2 text-3xl font-bold">{company.name}</h1>

          <p className="mt-2 text-slate-600">
            Your company workspace is connected and ready.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Company</p>
            <p className="mt-2 text-xl font-bold">{company.name}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Industry</p>
            <p className="mt-2 text-xl font-bold">
              {company.industry || "Not set"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Your role</p>
            <p className="mt-2 text-xl font-bold capitalize">{role}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
          <h2 className="text-xl font-bold">Company onboarding works.</h2>

          <p className="mt-3 leading-7">
            Your user account is now connected to a company workspace. Next,
            you can start adding real customer records.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Next build steps</h2>

          <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-600">
            <li>Open the Customers page.</li>
            <li>Add your first customer.</li>
            <li>Confirm it saves to Supabase.</li>
            <li>Confirm the customer is attached to your company_id.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}