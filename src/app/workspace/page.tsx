import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DashboardInsightCharts } from "@/components/ui/DashboardInsightCharts";

function getStartOfMonth() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getStaleDateString(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return date.toISOString();
}

function formatCurrency(value: number | string | null) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
}

function getCustomerName(customerRelation: unknown) {
  if (Array.isArray(customerRelation)) {
    return customerRelation[0]?.name || "No customer";
  }

  if (
    typeof customerRelation === "object" &&
    customerRelation !== null &&
    "name" in customerRelation
  ) {
    return String(
      (customerRelation as { name?: string | null }).name || "No customer",
    );
  }

  return "No customer";
}

function getServiceRevenue(
  sales: { service_type: string | null; amount: number | string | null }[],
) {
  const serviceMap = new Map<string, number>();

  sales.forEach((sale) => {
    const service = sale.service_type || "Uncategorized";
    const current = serviceMap.get(service) || 0;

    serviceMap.set(service, current + Number(sale.amount || 0));
  });

  return Array.from(serviceMap.entries())
    .map(([service, revenue]) => ({
      service,
      revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function getLeadInterest(
  leads: {
    service_requested: string | null;
    estimated_value: number | string | null;
  }[],
) {
  const serviceMap = new Map<
    string,
    {
      count: number;
      estimatedValue: number;
    }
  >();

  leads.forEach((lead) => {
    const service = lead.service_requested || "Uncategorized";
    const current = serviceMap.get(service) || {
      count: 0,
      estimatedValue: 0,
    };

    serviceMap.set(service, {
      count: current.count + 1,
      estimatedValue:
        current.estimatedValue + Number(lead.estimated_value || 0),
    });
  });

  return Array.from(serviceMap.entries())
    .map(([service, data]) => ({
      label: service,
      value: data.count,
      helper: `${formatCurrency(data.estimatedValue)} estimated value`,
    }))
    .sort((a, b) => b.value - a.value);
}

function getPipelineBreakdown(leads: { status: string | null }[]) {
  const statusMap = new Map<string, number>();

  leads.forEach((lead) => {
    const status = lead.status || "Unknown";
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  });

  return Array.from(statusMap.entries())
    .map(([status, count]) => ({
      label: status,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);
}

function getRevenueTrend(
  sales: { sale_date: string | null; amount: number | string | null }[],
) {
  const now = new Date();

  const months = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}`;

    return {
      key,
      label: date.toLocaleString("default", { month: "short" }),
      revenue: 0,
    };
  });

  sales.forEach((sale) => {
    if (!sale.sale_date) {
      return;
    }

    const saleMonth = sale.sale_date.slice(0, 7);
    const month = months.find((item) => item.key === saleMonth);

    if (month) {
      month.revenue += Number(sale.amount || 0);
    }
  });

  return months.map(({ label, revenue }) => ({
    label,
    revenue,
  }));
}

function getDailySummary({
  followUpsDue,
  unpaidRevenue,
  openEstimateValue,
  dataIssueCount,
}: {
  followUpsDue: number;
  unpaidRevenue: number;
  openEstimateValue: number;
  dataIssueCount: number;
}) {
  if (
    followUpsDue === 0 &&
    unpaidRevenue === 0 &&
    openEstimateValue === 0 &&
    dataIssueCount === 0
  ) {
    return "Everything is clear right now. No urgent follow-ups, unpaid revenue, open estimate value, or record cleanup issues are showing.";
  }

  const parts = [];

  if (followUpsDue > 0) {
    parts.push(`${followUpsDue} follow-up${followUpsDue === 1 ? "" : "s"} due`);
  }

  if (openEstimateValue > 0) {
    parts.push(`${formatCurrency(openEstimateValue)} in open estimate value`);
  }

  if (unpaidRevenue > 0) {
    parts.push(`${formatCurrency(unpaidRevenue)} unpaid or partially paid`);
  }

  if (dataIssueCount > 0) {
    parts.push(
      `${dataIssueCount} record cleanup item${dataIssueCount === 1 ? "" : "s"}`,
    );
  }

  return `Today’s focus: ${parts.join(", ")}.`;
}

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

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  const startOfMonth = getStartOfMonth();
  const today = getTodayString();
  const staleCutoff = getStaleDateString(14);

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name, phone, email, address, customer_type, notes, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (customersError) {
    throw new Error(customersError.message);
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select(
      `
      id,
      customer_id,
      status,
      estimated_value,
      source,
      service_requested,
      next_follow_up_date,
      notes,
      created_at,
      customers (
        name
      )
    `,
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(
      `
      id,
      customer_id,
      lead_id,
      status,
      job_value,
      service_type,
      start_date,
      completed_date,
      paid_status,
      notes,
      created_at,
      customers (
        name
      )
    `,
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select(
      `
      id,
      customer_id,
      job_id,
      amount,
      payment_status,
      sale_date,
      service_type,
      source,
      created_at,
      customers (
        name
      )
    `,
    )
    .eq("company_id", company.id)
    .order("sale_date", { ascending: false });

  if (salesError) {
    throw new Error(salesError.message);
  }

  const { data: followUps, error: followUpsError } = await supabase
    .from("follow_ups")
    .select(
      `
      id,
      customer_id,
      lead_id,
      due_date,
      status,
      message,
      created_at,
      customers (
        name
      ),
      leads (
        service_requested
      )
    `,
    )
    .eq("company_id", company.id)
    .order("due_date", { ascending: true });

  if (followUpsError) {
    throw new Error(followUpsError.message);
  }

  const totalCustomers = customers?.length || 0;
  const totalLeads = leads?.length || 0;
  const totalSales = sales?.length || 0;

  const totalRevenue =
    sales?.reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const monthlyRevenue =
    sales
      ?.filter((sale) => sale.sale_date >= startOfMonth)
      .reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const unpaidRevenue =
    sales
      ?.filter((sale) => sale.payment_status !== "Paid")
      .reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const openEstimateValue =
    leads
      ?.filter((lead) => lead.status === "Estimate Sent")
      .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0) || 0;

  const activeJobs =
    jobs?.filter(
      (job) => job.status === "Scheduled" || job.status === "In Progress",
    ).length || 0;

  const completedJobs =
    jobs?.filter((job) => job.status === "Completed" || job.status === "Paid")
      .length || 0;

  const followUpsDue =
    followUps?.filter(
      (followUp) => followUp.status === "Open" && followUp.due_date <= today,
    ).length || 0;

  const missingCustomerContact =
    customers?.filter((customer) => !customer.phone && !customer.email)
      .length || 0;

  const leadsWithoutCustomer =
    leads?.filter((lead) => !lead.customer_id).length || 0;

  const jobsMissingValue =
    jobs?.filter((job) => !job.job_value || Number(job.job_value) === 0)
      .length || 0;

  const salesMissingSource = sales?.filter((sale) => !sale.source).length || 0;

  const followUpsWithoutRelationship =
    followUps?.filter((followUp) => !followUp.customer_id && !followUp.lead_id)
      .length || 0;

  const dataIssueCount =
    missingCustomerContact +
    leadsWithoutCustomer +
    jobsMissingValue +
    salesMissingSource +
    followUpsWithoutRelationship;

  const dataHealthScore = Math.max(0, Math.min(100, 100 - dataIssueCount * 6));

  const dueFollowUps =
    followUps
      ?.filter(
        (followUp) => followUp.status === "Open" && followUp.due_date <= today,
      )
      .slice(0, 4) || [];

  const staleLeadList =
    leads
      ?.filter(
        (lead) =>
          !["Won", "Lost"].includes(lead.status) &&
          lead.created_at < staleCutoff,
      )
      .slice(0, 4) || [];

  const unpaidSales =
    sales?.filter((sale) => sale.payment_status !== "Paid").slice(0, 4) || [];

  const recentActivity = [
    ...(leads || []).slice(0, 4).map((lead) => ({
      id: `lead-${lead.id}`,
      type: profile.labels.leadSingular,
      title: lead.service_requested || "Untitled opportunity",
      subtitle: `${getCustomerName(lead.customers)} • ${lead.status}`,
      date: lead.created_at,
      href: "/leads",
    })),
    ...(jobs || []).slice(0, 4).map((job) => ({
      id: `job-${job.id}`,
      type: profile.labels.jobSingular,
      title: job.service_type || "Untitled work record",
      subtitle: `${getCustomerName(job.customers)} • ${job.status}`,
      date: job.created_at,
      href: "/jobs",
    })),
    ...(sales || []).slice(0, 4).map((sale) => ({
      id: `sale-${sale.id}`,
      type: profile.labels.saleSingular,
      title: formatCurrency(sale.amount),
      subtitle: `${getCustomerName(sale.customers)} • ${sale.payment_status}`,
      date: sale.created_at,
      href: "/sales",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const revenueTrend = getRevenueTrend(sales || []);

  const serviceRevenue = getServiceRevenue(sales || []).slice(0, 6);

  const revenueByService = serviceRevenue.map((item) => ({
    label: item.service,
    value: item.revenue,
  }));

  const interestByService = getLeadInterest(leads || [])
    .slice(0, 6)
    .map((item) => ({
      label: item.label,
      value: item.value,
    }));

  const pipelineBreakdown = getPipelineBreakdown(leads || []).slice(0, 6);

  const dailySummary = getDailySummary({
    followUpsDue,
    unpaidRevenue,
    openEstimateValue,
    dataIssueCount,
  });

  const priorityCards = [
    {
      title: "Follow up",
      value: followUpsDue,
      description:
        followUpsDue > 0
          ? "Open reminders are due today or overdue."
          : "No follow-ups are due right now.",
      href: "/follow-ups",
      tone: followUpsDue > 0 ? ("warning" as const) : ("neutral" as const),
      cta: followUpsDue > 0 ? "Review queue" : "View reminders",
    },
    {
      title: "Protect pipeline",
      value: formatCurrency(openEstimateValue),
      description:
        openEstimateValue > 0
          ? `${profile.labels.leadPlural} marked Estimate Sent may need follow-up.`
          : "No estimate value is currently waiting.",
      href: "/crm",
      tone: openEstimateValue > 0 ? ("warning" as const) : ("neutral" as const),
      cta: "Open CRM",
    },
    {
      title: "Collect revenue",
      value: formatCurrency(unpaidRevenue),
      description:
        unpaidRevenue > 0
          ? "Payments marked unpaid or partial need attention."
          : "No unpaid revenue is showing right now.",
      href: "/sales",
      tone: unpaidRevenue > 0 ? ("warning" as const) : ("neutral" as const),
      cta: "View sales",
    },
    {
      title: "Clean records",
      value: `${dataHealthScore}%`,
      description:
        dataIssueCount > 0
          ? `${dataIssueCount} records need cleanup for better reporting.`
          : "Core records are clean enough for reporting.",
      href: "/data-hub",
      tone: dataIssueCount > 0 ? ("warning" as const) : ("success" as const),
      cta: "Open Data Hub",
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
          eyebrow={profile.label}
          title="Daily brief"
          description={profile.dailyFocus}
          actions={
            <Link
              href="/ai-assistant"
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Generate AI brief
            </Link>
          }
        />

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="border-b border-slate-100 p-6 xl:border-b-0 xl:border-r">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge
                  tone={
                    followUpsDue > 0 || unpaidRevenue > 0 || dataIssueCount > 0
                      ? "warning"
                      : "success"
                  }
                >
                  {followUpsDue > 0 || unpaidRevenue > 0 || dataIssueCount > 0
                    ? "Needs attention"
                    : "Stable"}
                </StatusBadge>

                <p className="text-sm font-medium text-slate-500">
                  {new Date().toLocaleDateString()}
                </p>
              </div>

              <h2 className="mt-5 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                {dailySummary}
              </h2>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                FrontierOps is organizing your{" "}
                {profile.labels.customerPlural.toLowerCase()},{" "}
                {profile.labels.leadPlural.toLowerCase()},{" "}
                {profile.labels.jobPlural.toLowerCase()}, revenue, and
                follow-ups into one operating view.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-slate-100 xl:divide-y-0">
              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">
                  {profile.priorityNames.revenue}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {formatCurrency(monthlyRevenue)}
                </p>
                <p className="mt-1 text-xs text-slate-500">This month</p>
              </div>

              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">
                  {profile.priorityNames.pipeline}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {formatCurrency(openEstimateValue)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Open value</p>
              </div>

              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">
                  {profile.priorityNames.activeWork}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {activeJobs}
                </p>
                <p className="mt-1 text-xs text-slate-500">Active now</p>
              </div>

              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">
                  {profile.priorityNames.dataHealth}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {dataHealthScore}%
                </p>
                <p className="mt-1 text-xs text-slate-500">Record quality</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {priorityCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-semibold text-slate-500">
                  {card.title}
                </p>
                <StatusBadge tone={card.tone}>
                  {card.tone === "warning" ? "Review" : "Clear"}
                </StatusBadge>
              </div>

              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {card.value}
              </p>

              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
                {card.description}
              </p>

              <p className="mt-4 text-sm font-semibold text-slate-950">
                {card.cta} →
              </p>
            </Link>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.9fr]">
          <SectionCard
            title="Action queue"
            description="The records most likely to affect follow-up, cash flow, or data quality today."
          >
            <div className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              <div>
                <div className="border-b border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    Due follow-ups
                  </p>
                </div>

                {dueFollowUps.length === 0 ? (
                  <div className="p-5 text-sm text-slate-500">
                    Nothing due right now.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {dueFollowUps.map((followUp) => (
                      <Link
                        href="/follow-ups"
                        key={followUp.id}
                        className="block p-5 hover:bg-slate-50"
                      >
                        <p className="font-semibold text-slate-950">
                          {getCustomerName(followUp.customers)}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {followUp.message}
                        </p>
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          Due {formatDate(followUp.due_date)}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="border-b border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    Stale pipeline
                  </p>
                </div>

                {staleLeadList.length === 0 ? (
                  <div className="p-5 text-sm text-slate-500">
                    No stale open records.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {staleLeadList.map((lead) => (
                      <Link
                        href="/leads"
                        key={lead.id}
                        className="block p-5 hover:bg-slate-50"
                      >
                        <p className="font-semibold text-slate-950">
                          {lead.service_requested}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {getCustomerName(lead.customers)}
                        </p>
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          Created {formatDate(lead.created_at)}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="border-b border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    Unpaid revenue
                  </p>
                </div>

                {unpaidSales.length === 0 ? (
                  <div className="p-5 text-sm text-slate-500">
                    No unpaid revenue showing.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {unpaidSales.map((sale) => (
                      <Link
                        href="/sales"
                        key={sale.id}
                        className="block p-5 hover:bg-slate-50"
                      >
                        <p className="font-semibold text-slate-950">
                          {formatCurrency(sale.amount)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {getCustomerName(sale.customers)}
                        </p>
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          {sale.payment_status}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="What matters here"
            description={`Industry-specific checks for ${profile.label.toLowerCase()}.`}
          >
            <div className="space-y-3 p-5">
              {profile.insightPrompts.map((prompt) => (
                <div
                  key={prompt}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm font-medium leading-6 text-slate-700">
                    {prompt}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            label={profile.labels.customerPlural}
            value={totalCustomers}
            helper="Stored records"
          />

          <StatCard
            label={profile.labels.leadPlural}
            value={totalLeads}
            helper="Pipeline records"
          />

          <StatCard
            label={profile.labels.jobPlural}
            value={`${activeJobs} / ${completedJobs}`}
            helper="Active / completed"
          />

          <StatCard
            label={profile.labels.salePlural}
            value={totalSales}
            helper={`${formatCurrency(totalRevenue)} all-time value`}
          />
        </section>

        <DashboardInsightCharts
          revenueTrend={revenueTrend}
          revenueByService={revenueByService}
          interestByService={interestByService}
          pipelineBreakdown={pipelineBreakdown}
        />

        <SectionCard
          title="Recent movement"
          description="Newest activity across leads, jobs, and revenue."
        >
          {recentActivity.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Add records to begin building business history."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentActivity.map((item) => (
                <Link
                  href={item.href}
                  key={item.id}
                  className="grid gap-3 p-5 hover:bg-slate-50 md:grid-cols-[130px_1fr_110px]"
                >
                  <p className="text-sm font-semibold text-slate-500">
                    {item.type}
                  </p>

                  <div>
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.subtitle}
                    </p>
                  </div>

                  <p className="text-sm font-medium text-slate-500 md:text-right">
                    {formatDate(item.date)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
