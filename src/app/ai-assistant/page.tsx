import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
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
        <PageHeader
          eyebrow="AI Assistant"
          title="Business summary"
          description="Generate clear, plain-English insights from your live customer, lead, job, sales, and follow-up data."
        />

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <GenerateSummaryButton />

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
              How it works
            </p>

            <h2 className="mt-3 text-2xl font-black tracking-tight">
              Metrics in. Action plan out.
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-300">
              FrontierOps sends business metrics to AI, not raw private customer
              details. The result is a concise summary of what is happening,
              what needs attention, and what to do next.
            </p>

            <div className="mt-6 grid gap-3">
              {[
                "Revenue and unpaid work",
                "Open estimates and pipeline value",
                "Follow-ups due now",
                "Active jobs and completed work",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <SectionCard
          title="Saved AI reports"
          description="Recent business summaries generated for this company."
        >
          {!reports || reports.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-black text-slate-950">
                No AI reports yet.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Generate your first summary above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.map((report) => (
                <article key={report.id} className="p-5">
                  <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
                        {report.report_type.replace("_", " ")}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 whitespace-pre-wrap rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                    {report.summary}
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
