import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { GenerateSummaryButton } from "./GenerateSummaryButton";

export default async function AiAssistantPage() {
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

  const { company } = currentCompany;

  const { data: reports, error } = await supabase
    .from("ai_reports")
    .select("id, report_type, summary, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""}>
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            AI Assistant
          </p>

          <h1 className="mt-2 text-3xl font-bold">Business Summary</h1>

          <p className="mt-2 text-slate-600">
            Generate plain-English insights from your live FrontierOps data.
          </p>
        </header>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-lg font-bold">Testing note</h2>

          <p className="mt-2 text-sm leading-6">
            For the MVP, only send basic business metrics to AI. Avoid sending
            sensitive customer details, private notes, payment details, or
            anything a client would not want shared with an external AI
            provider.
          </p>
        </section>

        <GenerateSummaryButton />

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-bold">Saved AI reports</h2>
            <p className="mt-1 text-sm text-slate-500">
              Recent summaries saved for this company.
            </p>
          </div>

          {!reports || reports.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No AI reports yet. Generate your first summary above.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.map((report) => (
                <article key={report.id} className="p-5">
                  <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {report.report_type}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {report.summary}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
