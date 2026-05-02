import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
}

function formatDateTime(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleString();
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getStatusTone(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (
    normalized.includes("complete") ||
    normalized.includes("committed") ||
    normalized.includes("active") ||
    normalized.includes("paid") ||
    normalized.includes("won")
  ) {
    return "success" as const;
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("lost") ||
    normalized.includes("cancel")
  ) {
    return "danger" as const;
  }

  if (
    normalized.includes("ready") ||
    normalized.includes("pending") ||
    normalized.includes("analyzing") ||
    normalized.includes("unpaid") ||
    normalized.includes("partial") ||
    normalized.includes("open")
  ) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function getHealthTone(score: number) {
  if (score >= 90) {
    return "positive" as const;
  }

  if (score >= 70) {
    return "warning" as const;
  }

  return "danger" as const;
}

function getRecordTypeLabel(recordType: string | null) {
  const labels: Record<string, string> = {
    relationships: "People",
    opportunities: "Opportunities",
    work: "Work",
    revenue: "Revenue",
    actions: "Follow-ups",
  };

  return labels[String(recordType || "")] || String(recordType || "Records");
}

function getSourceLabel(sourceType: string | null) {
  const labels: Record<string, string> = {
    csv: "CSV",
    google_sheets: "Google Sheets",
  };

  return labels[String(sourceType || "")] || String(sourceType || "Source");
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
    importSessionsResult,
    syncRunsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email, address, customer_type, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(200),

    supabase
      .from("leads")
      .select(
        "id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(200),

    supabase
      .from("jobs")
      .select(
        "id, customer_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(200),

    supabase
      .from("sales")
      .select(
        "id, amount, payment_status, sale_date, service_type, source, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(200),

    supabase
      .from("follow_ups")
      .select("id, message, due_date, status, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(200),

    supabase
      .from("import_sessions")
      .select(
        "id, source_type, source_name, file_name, record_type, status, total_rows, valid_rows, duplicate_rows, error_rows, created_rows, updated_rows, skipped_rows, created_at, committed_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("sync_runs")
      .select(
        "id, status, records_seen, records_created, records_updated, records_failed, error_message, started_at, finished_at, metadata",
      )
      .eq("company_id", company.id)
      .order("started_at", { ascending: false })
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

  if (importSessionsResult.error) {
    throw new Error(importSessionsResult.error.message);
  }

  if (syncRunsResult.error) {
    throw new Error(syncRunsResult.error.message);
  }

  const customers = customersResult.data || [];
  const leads = leadsResult.data || [];
  const jobs = jobsResult.data || [];
  const sales = salesResult.data || [];
  const followUps = followUpsResult.data || [];
  const importSessions = importSessionsResult.data || [];
  const syncRuns = syncRunsResult.data || [];

  const missingContact = customers.filter(
    (customer) => !customer.phone && !customer.email,
  );

  const missingAddress = customers.filter((customer) => !customer.address);

  const opportunitiesWithoutCustomer = leads.filter(
    (lead) => !lead.customer_id,
  );

  const opportunitiesMissingSource = leads.filter((lead) => !lead.source);

  const opportunitiesMissingValue = leads.filter(
    (lead) =>
      lead.estimated_value === null || lead.estimated_value === undefined,
  );

  const workMissingValue = jobs.filter(
    (job) => job.job_value === null || job.job_value === undefined,
  );

  const revenueMissingSource = sales.filter((sale) => !sale.source);

  const failedImports = importSessions.filter(
    (session) => session.status === "failed",
  );

  const openImportReviews = importSessions.filter(
    (session) =>
      session.status === "ready" ||
      session.status === "analyzing" ||
      session.status === "draft",
  );

  const failedSyncRuns = syncRuns.filter((run) => run.status === "failed");

  const cleanupGroups = [
    {
      id: "missing-contact",
      label: "Add contact",
      title: `${profile.labels.customerPlural} need contact details`,
      detail: "Records without phone or email are harder to follow up with.",
      count: missingContact.length,
      href: "/customers",
      tone: "neutral" as const,
    },
    {
      id: "missing-address",
      label: "Add address",
      title: `${profile.labels.customerPlural} need addresses`,
      detail:
        "Addresses help with service area, job planning, and local context.",
      count: missingAddress.length,
      href: "/customers",
      tone: "neutral" as const,
    },
    {
      id: "opportunity-customer",
      label: "Link opportunity",
      title: "Opportunities need people or businesses",
      detail: "Pipeline records should usually be connected to someone.",
      count: opportunitiesWithoutCustomer.length,
      href: "/leads",
      tone: "neutral" as const,
    },
    {
      id: "opportunity-source",
      label: "Add source",
      title: "Opportunities need sources",
      detail:
        "Source tracking helps show which marketing channels are working.",
      count: opportunitiesMissingSource.length,
      href: "/leads",
      tone: "neutral" as const,
    },
    {
      id: "opportunity-value",
      label: "Add estimate",
      title: "Opportunities need estimated values",
      detail:
        "Estimated value helps prioritize the most important opportunities.",
      count: opportunitiesMissingValue.length,
      href: "/leads",
      tone: "neutral" as const,
    },
    {
      id: "work-value",
      label: "Add work value",
      title: "Work records need values",
      detail: "Work value helps reporting reflect active and completed work.",
      count: workMissingValue.length,
      href: "/jobs",
      tone: "neutral" as const,
    },
    {
      id: "revenue-source",
      label: "Add revenue source",
      title: "Revenue needs sources",
      detail: "Revenue source helps show what generated paid work.",
      count: revenueMissingSource.length,
      href: "/sales",
      tone: "neutral" as const,
    },
    {
      id: "import-reviews",
      label: "Review import",
      title: "Imports are waiting for review",
      detail:
        "Uncommitted imports should be reviewed, committed, or cancelled.",
      count: openImportReviews.length,
      href: "/imports",
      tone: "warning" as const,
    },
    {
      id: "failed-imports",
      label: "Fix import",
      title: "Imports failed",
      detail: "Failed import sessions may need cleanup or a new upload.",
      count: failedImports.length,
      href: "/imports",
      tone: "danger" as const,
    },
    {
      id: "failed-syncs",
      label: "Fix sync",
      title: "Sync runs failed",
      detail:
        "Failed sync activity should be reviewed before relying on imported data.",
      count: failedSyncRuns.length,
      href: "/imports",
      tone: "danger" as const,
    },
  ].filter((item) => item.count > 0);

  const totalRecords =
    customers.length +
    leads.length +
    jobs.length +
    sales.length +
    followUps.length;

  const totalCleanupIssues = cleanupGroups.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const healthScore =
    totalRecords === 0
      ? 100
      : Math.max(
          0,
          Math.round(
            100 - (totalCleanupIssues / Math.max(totalRecords, 1)) * 100,
          ),
        );

  const committedSessions = importSessions.filter(
    (session) => session.status === "committed",
  );

  const importedRows = committedSessions.reduce(
    (sum, session) =>
      sum +
      Number(session.created_rows || 0) +
      Number(session.updated_rows || 0),
    0,
  );

  const recentRecords = [
    ...customers.map((customer) => ({
      id: `customer-${customer.id}`,
      type: "Person",
      title: customer.name || "Unnamed record",
      detail: customer.email || customer.phone || "No contact saved",
      date: customer.created_at,
      href: "/customers",
    })),
    ...leads.map((lead) => ({
      id: `lead-${lead.id}`,
      type: "Opportunity",
      title: lead.service_requested || "Untitled opportunity",
      detail: lead.source || lead.status || "No source saved",
      date: lead.created_at,
      href: "/leads",
    })),
    ...jobs.map((job) => ({
      id: `job-${job.id}`,
      type: "Work",
      title: job.service_type || "Untitled work",
      detail: job.status || "No status saved",
      date: job.created_at,
      href: "/jobs",
    })),
    ...sales.map((sale) => ({
      id: `sale-${sale.id}`,
      type: "Revenue",
      title: formatCurrency(sale.amount),
      detail: sale.service_type || sale.payment_status || "Revenue record",
      date: sale.created_at,
      href: "/sales",
    })),
    ...followUps.map((followUp) => ({
      id: `follow-up-${followUp.id}`,
      type: "Follow-Up",
      title: followUp.message || "Follow-up",
      detail: followUp.status || "Open",
      date: followUp.created_at,
      href: "/follow-ups",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Insights"
          title="Data health and activity"
          description="See cleanup issues, import health, and recent records across the workspace."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/imports"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Import data
              </Link>

              <Link
                href="/workspace"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to Home
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Health score"
            value={`${healthScore}%`}
            helper={
              totalCleanupIssues > 0
                ? `${totalCleanupIssues} cleanup issues found`
                : "No cleanup issues found"
            }
            tone={getHealthTone(healthScore)}
          />

          <StatCard
            label="Tracked records"
            value={totalRecords}
            helper="People, opportunities, work, revenue, and follow-ups"
          />

          <StatCard
            label="Imported rows"
            value={importedRows}
            helper={`${committedSessions.length} committed imports`}
            tone={importedRows > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Import issues"
            value={failedImports.length + failedSyncRuns.length}
            helper="Failed imports or sync runs"
            tone={
              failedImports.length + failedSyncRuns.length > 0
                ? "danger"
                : "positive"
            }
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr] items-start">
          <SectionCard
            title="Cleanup queue"
            description="Grouped data issues that can affect reporting and follow-up."
          >
            {cleanupGroups.length === 0 ? (
              <EmptyState
                title="Data looks clean"
                description="No major cleanup issues were found in the current workspace."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {cleanupGroups.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {item.count}
                        </span>
                      </div>

                      <p className="font-semibold text-slate-950">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {item.detail}
                      </p>
                    </div>

                    <Link
                      href={item.href}
                      className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Review
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Import health"
            description="Recent import sessions and sync runs."
          >
            {importSessions.length === 0 && syncRuns.length === 0 ? (
              <EmptyState
                title="No import activity yet"
                description="Import CSV or Google Sheets data to create history here."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {importSessions.slice(0, 5).map((session) => (
                  <article key={session.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {session.file_name ||
                            session.source_name ||
                            "Import session"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {getSourceLabel(session.source_type)} ·{" "}
                          {getRecordTypeLabel(session.record_type)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {session.valid_rows} ready · {session.duplicate_rows}{" "}
                          duplicates · {session.error_rows} errors
                        </p>
                      </div>

                      <div className="text-right">
                        <StatusBadge tone={getStatusTone(session.status)}>
                          {session.status}
                        </StatusBadge>
                        <p className="mt-2 text-xs text-slate-500">
                          {formatDateTime(
                            session.committed_at || session.created_at,
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr] items-start">
          <SectionCard
            title="Record mix"
            description="Current records by business area."
          >
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {[
                {
                  label: "People",
                  value: customers.length,
                  href: "/customers",
                },
                {
                  label: "Opportunities",
                  value: leads.length,
                  href: "/leads",
                },
                { label: "Work", value: jobs.length, href: "/jobs" },
                { label: "Revenue", value: sales.length, href: "/sales" },
                {
                  label: "Follow-ups",
                  value: followUps.length,
                  href: "/follow-ups",
                },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-white"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {item.value}
                  </p>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Recently added records"
            description="Newest records created across the workspace."
          >
            {recentRecords.length === 0 ? (
              <EmptyState
                title="No records added yet"
                description="Import data or create records to start building the workspace."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentRecords.map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-3 p-4 md:grid-cols-[120px_1fr_120px] md:items-center"
                  >
                    <div>
                      <StatusBadge tone="neutral">{item.type}</StatusBadge>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-950">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.detail}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-sm font-medium text-slate-500">
                        {formatDate(item.date)}
                      </p>
                      <Link
                        href={item.href}
                        className="mt-2 inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Review
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </section>
      </div>
    </AppShell>
  );
}
