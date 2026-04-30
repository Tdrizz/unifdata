import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { GenerateSummaryButton } from "./GenerateSummaryButton";

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleString();
}

function formatCurrency(value: number | string | null) {
  return `$${Number(value || 0).toLocaleString()}`;
}

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
  const profile = getIndustryProfile(company.business_sector);

  const [
    customersResult,
    leadsResult,
    jobsResult,
    salesResult,
    followUpsResult,
    reportsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, phone, email, address")
      .eq("company_id", company.id),

    supabase
      .from("leads")
      .select("id, status, estimated_value, source")
      .eq("company_id", company.id),

    supabase
      .from("jobs")
      .select("id, status, job_value, paid_status")
      .eq("company_id", company.id),

    supabase
      .from("sales")
      .select("id, amount, payment_status, service_type, source")
      .eq("company_id", company.id),

    supabase
      .from("follow_ups")
      .select("id, status, due_date")
      .eq("company_id", company.id),

    supabase
      .from("ai_reports")
      .select("id, report_type, summary, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (customersResult.error) {
    throw new Error(customersResult.error.message);
  }

  if (leadsResult.error) {
    throw new Error(leadsResult.error.message);
  }

  if (jobsResult.error) {
    throw new Error(jobsResult.error.message);
  }

  if (salesResult.error) {
    throw new Error(salesResult.error.message);
  }

  if (followUpsResult.error) {
    throw new Error(followUpsResult.error.message);
  }

  if (reportsResult.error) {
    throw new Error(reportsResult.error.message);
  }

  const customers = customersResult.data || [];
  const leads = leadsResult.data || [];
  const jobs = jobsResult.data || [];
  const sales = salesResult.data || [];
  const followUps = followUpsResult.data || [];
  const reports = reportsResult.data || [];

  const openLeads = leads.filter(
    (lead) => lead.status !== "Won" && lead.status !== "Lost",
  ).length;

  const openPipelineValue = leads
    .filter((lead) => lead.status !== "Won" && lead.status !== "Lost")
    .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);

  const activeJobs = jobs.filter(
    (job) => job.status === "Scheduled" || job.status === "In Progress",
  ).length;

  const totalRevenue = sales.reduce(
    (sum, sale) => sum + Number(sale.amount || 0),
    0,
  );

  const unpaidRevenue = sales
    .filter((sale) => sale.payment_status !== "Paid")
    .reduce((sum, sale) => sum + Number(sale.amount || 0), 0);

  const openFollowUps = followUps.filter(
    (followUp) => followUp.status === "Open",
  ).length;

  const missingCustomerContact = customers.filter(
    (customer) => !customer.phone && !customer.email,
  ).length;

  const missingLeadSource = leads.filter((lead) => !lead.source).length;

  const missingSaleSource = sales.filter((sale) => !sale.source).length;

  const dataIssues =
    missingCustomerContact + missingLeadSource + missingSaleSource;

  const latestReport = reports[0];

  const advisorInputs = [
    {
      label: profile.labels.customerPlural,
      value: customers.length,
      description:
        "Contact records, missing details, and relationship context.",
      href: "/customers",
    },
    {
      label: profile.labels.leadPlural,
      value: leads.length,
      description: "Pipeline status, source tracking, and estimated value.",
      href: "/leads",
    },
    {
      label: profile.labels.jobPlural,
      value: jobs.length,
      description: "Scheduled, active, completed, and paid work records.",
      href: "/jobs",
    },
    {
      label: profile.labels.salePlural,
      value: sales.length,
      description: "Revenue, payment status, source, and service category.",
      href: "/sales",
    },
    {
      label: profile.labels.followUpPlural,
      value: followUps.length,
      description: "Open reminders, overdue actions, and relationship tasks.",
      href: "/follow-ups",
    },
  ];

  const recommendedChecks = [
    {
      title: "Follow-up risk",
      description:
        openFollowUps > 0
          ? `${openFollowUps} open follow-ups may need attention.`
          : "No open follow-ups are showing right now.",
      tone: openFollowUps > 0 ? ("warning" as const) : ("success" as const),
      href: "/follow-ups",
    },
    {
      title: "Pipeline value",
      description:
        openPipelineValue > 0
          ? `${formatCurrency(openPipelineValue)} is sitting in open pipeline records.`
          : "No open pipeline value is currently showing.",
      tone: openPipelineValue > 0 ? ("warning" as const) : ("neutral" as const),
      href: "/crm",
    },
    {
      title: "Unpaid revenue",
      description:
        unpaidRevenue > 0
          ? `${formatCurrency(unpaidRevenue)} is marked unpaid or partial.`
          : "No unpaid revenue is currently showing.",
      tone: unpaidRevenue > 0 ? ("warning" as const) : ("success" as const),
      href: "/sales",
    },
    {
      title: "Data cleanup",
      description:
        dataIssues > 0
          ? `${dataIssues} records are missing important reporting fields.`
          : "Core records look clean enough for useful reporting.",
      tone: dataIssues > 0 ? ("warning" as const) : ("success" as const),
      href: "/data-hub",
    },
  ];

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Intelligence"
          title="AI Advisor"
          description="Generate a plain-English business brief from live relationships, opportunities, work, revenue, actions, and data quality."
          actions={
            <Link
              href="/workspace"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Today
            </Link>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Open pipeline"
            value={openLeads}
            helper={`${formatCurrency(openPipelineValue)} estimated value`}
          />

          <StatCard
            label="Active work"
            value={activeJobs}
            helper={`${profile.labels.jobPlural} scheduled or in progress`}
          />

          <StatCard
            label="Unpaid revenue"
            value={formatCurrency(unpaidRevenue)}
            helper={`${formatCurrency(totalRevenue)} total stored revenue`}
            tone={unpaidRevenue > 0 ? "warning" : "default"}
          />

          <StatCard
            label="Data issues"
            value={dataIssues}
            helper="Missing contact or source data"
            tone={dataIssues > 0 ? "warning" : "default"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.78fr_1.22fr]">
          <GenerateSummaryButton />

          <SectionCard
            title="What the advisor reviews"
            description={`The AI summary is tailored to ${profile.label.toLowerCase()} and uses the business records already stored in FrontierOps.`}
          >
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              {advisorInputs.map((input) => (
                <Link
                  key={input.label}
                  href={input.href}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {input.label}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {input.description}
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                      {input.value}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard
            title="Recommended checks"
            description="The main areas the AI brief should explain in plain English."
          >
            <div className="divide-y divide-slate-100">
              {recommendedChecks.map((check) => (
                <Link
                  key={check.title}
                  href={check.href}
                  className="flex items-start justify-between gap-4 p-5 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {check.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {check.description}
                    </p>
                  </div>

                  <StatusBadge tone={check.tone}>
                    {check.tone === "warning" ? "Review" : "Clear"}
                  </StatusBadge>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Latest AI brief"
            description="The most recent generated summary for this workspace."
          >
            {!latestReport ? (
              <EmptyState
                title="No AI brief yet"
                description="Generate your first summary to see what needs attention and what actions are recommended."
              />
            ) : (
              <article className="p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {latestReport.report_type.replace("_", " ")}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(latestReport.created_at)}
                    </p>
                  </div>

                  <StatusBadge>Latest</StatusBadge>
                </div>

                <div className="mt-5 whitespace-pre-wrap rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                  {latestReport.summary}
                </div>
              </article>
            )}
          </SectionCard>
        </section>

        <SectionCard
          title="Saved AI reports"
          description="A history of generated summaries and operating recommendations."
        >
          {reports.length === 0 ? (
            <EmptyState
              title="No saved reports yet"
              description="Generated summaries will be saved here so the business can track recommendations over time."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.map((report) => (
                <article key={report.id} className="p-5">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {report.report_type.replace("_", " ")}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(report.created_at)}
                      </p>
                    </div>

                    <StatusBadge>AI</StatusBadge>
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
