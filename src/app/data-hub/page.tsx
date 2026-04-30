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

function formatCurrency(value: number | string | null) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
}

function getScoreTone(score: number) {
  if (score >= 90) {
    return "success" as const;
  }

  if (score >= 75) {
    return "neutral" as const;
  }

  return "warning" as const;
}

export default async function DataHubPage() {
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
    importsResult,
    aiReportsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "id, name, phone, email, address, customer_type, notes, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("leads")
      .select(
        "id, customer_id, service_requested, status, source, estimated_value, next_follow_up_date, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("jobs")
      .select(
        "id, customer_id, lead_id, service_type, status, job_value, paid_status, start_date, completed_date, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("sales")
      .select(
        "id, customer_id, job_id, amount, payment_status, service_type, source, sale_date, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("follow_ups")
      .select("id, customer_id, lead_id, status, due_date, message, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("imports")
      .select("id, file_name, import_type, status, records_created, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(8),

    supabase
      .from("ai_reports")
      .select("id, report_type, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(8),
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

  if (importsResult.error) {
    throw new Error(importsResult.error.message);
  }

  if (aiReportsResult.error) {
    throw new Error(aiReportsResult.error.message);
  }

  const customers = customersResult.data || [];
  const leads = leadsResult.data || [];
  const jobs = jobsResult.data || [];
  const sales = salesResult.data || [];
  const followUps = followUpsResult.data || [];
  const imports = importsResult.data || [];
  const aiReports = aiReportsResult.data || [];

  const totalRecords =
    customers.length +
    leads.length +
    jobs.length +
    sales.length +
    followUps.length +
    imports.length +
    aiReports.length;

  const missingCustomerContact = customers.filter(
    (customer) => !customer.phone && !customer.email,
  ).length;

  const missingCustomerAddress = customers.filter(
    (customer) => !customer.address,
  ).length;

  const leadsWithoutCustomer = leads.filter((lead) => !lead.customer_id).length;

  const leadsMissingSource = leads.filter((lead) => !lead.source).length;

  const leadsMissingValue = leads.filter(
    (lead) => !lead.estimated_value || Number(lead.estimated_value) === 0,
  ).length;

  const jobsWithoutCustomer = jobs.filter((job) => !job.customer_id).length;

  const jobsMissingValue = jobs.filter(
    (job) => !job.job_value || Number(job.job_value) === 0,
  ).length;

  const salesWithoutCustomer = sales.filter((sale) => !sale.customer_id).length;

  const salesMissingSource = sales.filter((sale) => !sale.source).length;

  const followUpsWithoutRelationship = followUps.filter(
    (followUp) => !followUp.customer_id && !followUp.lead_id,
  ).length;

  const dataIssueCount =
    missingCustomerContact +
    missingCustomerAddress +
    leadsWithoutCustomer +
    leadsMissingSource +
    leadsMissingValue +
    jobsWithoutCustomer +
    jobsMissingValue +
    salesWithoutCustomer +
    salesMissingSource +
    followUpsWithoutRelationship;

  const dataHealthScore = Math.max(0, Math.min(100, 100 - dataIssueCount * 4));

  const totalRevenue = sales.reduce(
    (sum, sale) => sum + Number(sale.amount || 0),
    0,
  );

  const totalPipelineValue = leads.reduce(
    (sum, lead) => sum + Number(lead.estimated_value || 0),
    0,
  );

  const recordCollections = [
    {
      title: profile.labels.customerPlural,
      description: "People and companies stored in the workspace.",
      count: customers.length,
      href: "/customers",
    },
    {
      title: profile.labels.leadPlural,
      description: "Pipeline, quotes, estimates, inquiries, and opportunities.",
      count: leads.length,
      href: "/leads",
    },
    {
      title: profile.labels.jobPlural,
      description: "Work records, projects, appointments, jobs, and status.",
      count: jobs.length,
      href: "/jobs",
    },
    {
      title: profile.labels.salePlural,
      description: "Revenue, payments, invoices, collections, and sources.",
      count: sales.length,
      href: "/sales",
    },
    {
      title: profile.labels.followUpPlural,
      description: "Reminders and action items tied to relationships or work.",
      count: followUps.length,
      href: "/follow-ups",
    },
    {
      title: "Imports",
      description:
        "Data migration history from CSV and future external systems.",
      count: imports.length,
      href: "/imports",
    },
    {
      title: "AI reports",
      description: "Generated summaries and operating recommendations.",
      count: aiReports.length,
      href: "/ai-assistant",
    },
  ];

  const cleanupItems = [
    {
      label: `${profile.labels.customerPlural} missing phone and email`,
      description: "These records are harder to contact or follow up with.",
      value: missingCustomerContact,
      href: "/customers",
    },
    {
      label: `${profile.labels.customerPlural} missing address`,
      description: "Useful for service areas, job planning, and local context.",
      value: missingCustomerAddress,
      href: "/customers",
    },
    {
      label: `${profile.labels.leadPlural} without a customer`,
      description:
        "Pipeline records should be connected to a person or business.",
      value: leadsWithoutCustomer,
      href: "/leads",
    },
    {
      label: `${profile.labels.leadPlural} missing source`,
      description:
        "Source tracking helps show what marketing is actually working.",
      value: leadsMissingSource,
      href: "/leads",
    },
    {
      label: `${profile.labels.leadPlural} missing estimated value`,
      description: "Value helps prioritize the most important opportunities.",
      value: leadsMissingValue,
      href: "/leads",
    },
    {
      label: `${profile.labels.jobPlural} missing value`,
      description: "Work records need value to support operational reporting.",
      value: jobsMissingValue,
      href: "/jobs",
    },
    {
      label: `${profile.labels.salePlural} missing source`,
      description: "Revenue source helps identify what brings in paid work.",
      value: salesMissingSource,
      href: "/sales",
    },
    {
      label: `${profile.labels.followUpPlural} not connected to records`,
      description:
        "Follow-ups should usually connect to a customer or opportunity.",
      value: followUpsWithoutRelationship,
      href: "/follow-ups",
    },
  ];

  const recentRecords = [
    ...customers.slice(0, 5).map((item) => ({
      id: `customer-${item.id}`,
      type: profile.labels.customerSingular,
      label: item.name,
      detail: item.email || item.phone || "No contact info",
      createdAt: item.created_at,
      href: "/customers",
    })),
    ...leads.slice(0, 5).map((item) => ({
      id: `lead-${item.id}`,
      type: profile.labels.leadSingular,
      label: item.service_requested || "Untitled opportunity",
      detail: `${item.status || "Unknown"} • ${formatCurrency(
        item.estimated_value,
      )}`,
      createdAt: item.created_at,
      href: "/leads",
    })),
    ...jobs.slice(0, 5).map((item) => ({
      id: `job-${item.id}`,
      type: profile.labels.jobSingular,
      label: item.service_type || "Untitled work record",
      detail: `${item.status || "Unknown"} • ${formatCurrency(item.job_value)}`,
      createdAt: item.created_at,
      href: "/jobs",
    })),
    ...sales.slice(0, 5).map((item) => ({
      id: `sale-${item.id}`,
      type: profile.labels.saleSingular,
      label: formatCurrency(item.amount),
      detail: `${item.payment_status || "Unknown"} • ${
        item.service_type || "Uncategorized"
      }`,
      createdAt: item.created_at,
      href: "/sales",
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 10);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Data Hub"
          title="Business data command center"
          description="A clean access layer for the records, imports, quality checks, and activity that power your dashboards."
          actions={
            <Link
              href="/imports"
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Import data
            </Link>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Data health"
            value={`${dataHealthScore}%`}
            helper={`${dataIssueCount} cleanup items found`}
            tone={dataHealthScore < 85 ? "warning" : "default"}
          />

          <StatCard
            label="Total records"
            value={totalRecords}
            helper="Across records, imports, and AI reports"
          />

          <StatCard
            label="Pipeline value"
            value={formatCurrency(totalPipelineValue)}
            helper={`Estimated value across ${profile.labels.leadPlural.toLowerCase()}`}
          />

          <StatCard
            label="Revenue stored"
            value={formatCurrency(totalRevenue)}
            helper={`Total ${profile.labels.salePlural.toLowerCase()} value`}
            tone="positive"
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <SectionCard
            title="Data quality score"
            description="A simple signal for whether your records are clean enough to trust reporting."
          >
            <div className="p-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Current score
                    </p>
                    <p className="mt-2 text-5xl font-semibold tracking-tight text-slate-950">
                      {dataHealthScore}%
                    </p>
                  </div>

                  <StatusBadge tone={getScoreTone(dataHealthScore)}>
                    {dataHealthScore >= 90
                      ? "Clean"
                      : dataHealthScore >= 75
                        ? "Usable"
                        : "Needs cleanup"}
                  </StatusBadge>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-slate-950"
                    style={{ width: `${dataHealthScore}%` }}
                  />
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  FrontierOps checks for missing contact info, unlinked records,
                  missing values, missing sources, and disconnected follow-ups.
                  Cleaner records make the CRM, reports, and AI summaries more
                  useful.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Cleanup queue"
            description="The most important data issues to clean up first."
          >
            <div className="divide-y divide-slate-100">
              {cleanupItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="grid gap-4 p-5 hover:bg-slate-50 md:grid-cols-[1fr_90px]"
                >
                  <div>
                    <p className="font-semibold text-slate-950">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </div>

                  <div className="md:text-right">
                    <StatusBadge tone={item.value > 0 ? "warning" : "success"}>
                      {item.value}
                    </StatusBadge>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>
        </section>

        <SectionCard
          title="Record collections"
          description="The main data sets FrontierOps is organizing for this business."
        >
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {recordCollections.map((collection) => (
              <Link
                key={collection.title}
                href={collection.href}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">
                      {collection.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {collection.description}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                    {collection.count}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.9fr]">
          <SectionCard
            title="Recent records"
            description="Newest records created across the business workspace."
          >
            {recentRecords.length === 0 ? (
              <EmptyState
                title="No records yet"
                description="Add customers, opportunities, work, or revenue records to start building the business data layer."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentRecords.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="grid gap-3 p-5 hover:bg-slate-50 md:grid-cols-[130px_1fr_120px]"
                  >
                    <p className="text-sm font-semibold text-slate-500">
                      {item.type}
                    </p>

                    <div>
                      <p className="font-semibold text-slate-950">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.detail}
                      </p>
                    </div>

                    <p className="text-sm font-medium text-slate-500 md:text-right">
                      {formatDate(item.createdAt)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Migration history"
            description="Recent imports and AI reports generated from business data."
          >
            <div className="divide-y divide-slate-100">
              {imports.length === 0 && aiReports.length === 0 ? (
                <EmptyState
                  title="No migration history yet"
                  description="Import a customer list or generate an AI report to start building history."
                />
              ) : (
                <>
                  {imports.map((item) => (
                    <div key={`import-${item.id}`} className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {item.file_name}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {item.import_type} import • {item.records_created}{" "}
                            records
                          </p>
                        </div>

                        <StatusBadge
                          tone={
                            item.status === "completed" ? "success" : "neutral"
                          }
                        >
                          {item.status}
                        </StatusBadge>
                      </div>

                      <p className="mt-2 text-xs font-medium text-slate-500">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                  ))}

                  {aiReports.map((item) => (
                    <div key={`ai-${item.id}`} className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-950">
                            AI report generated
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {item.report_type.replace("_", " ")}
                          </p>
                        </div>

                        <StatusBadge>AI</StatusBadge>
                      </div>

                      <p className="mt-2 text-xs font-medium text-slate-500">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </SectionCard>
        </section>
      </div>
    </AppShell>
  );
}
