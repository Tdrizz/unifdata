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

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
}

function isTodayOrPast(date: string | null) {
  if (!date) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return target <= today;
}

function isPastDate(date: string | null) {
  if (!date) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return target < today;
}

function getFollowUpLabel(date: string | null) {
  if (!date) {
    return "No follow-up set";
  }

  if (isPastDate(date)) {
    return `Overdue ${formatDate(date)}`;
  }

  if (isTodayOrPast(date)) {
    return "Due today";
  }

  return `Follow up ${formatDate(date)}`;
}

function getFollowUpTone(date: string | null) {
  if (!date) {
    return "warning" as const;
  }

  if (isTodayOrPast(date)) {
    return "danger" as const;
  }

  return "neutral" as const;
}

function getStatusTone(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (
    normalized.includes("won") ||
    normalized.includes("paid") ||
    normalized.includes("complete") ||
    normalized.includes("done")
  ) {
    return "success" as const;
  }

  if (
    normalized.includes("overdue") ||
    normalized.includes("failed") ||
    normalized.includes("lost") ||
    normalized.includes("cancel")
  ) {
    return "danger" as const;
  }

  if (
    normalized.includes("new") ||
    normalized.includes("open") ||
    normalized.includes("scheduled") ||
    normalized.includes("partial") ||
    normalized.includes("unpaid") ||
    normalized.includes("follow")
  ) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function getRecentItems({
  customers,
  leads,
  jobs,
  sales,
  followUps,
  labels,
}: {
  customers: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string;
  }[];
  leads: {
    id: string;
    service_requested: string | null;
    status: string | null;
    source: string | null;
    created_at: string;
  }[];
  jobs: {
    id: string;
    service_type: string | null;
    status: string | null;
    created_at: string;
  }[];
  sales: {
    id: string;
    amount: number | null;
    payment_status: string | null;
    service_type: string | null;
    created_at: string;
  }[];
  followUps: {
    id: string;
    message: string | null;
    status: string | null;
    created_at: string;
  }[];
  labels: {
    customerSingular: string;
    leadSingular: string;
    jobSingular: string;
    saleSingular: string;
  };
}) {
  return [
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
      type: "Action",
      title: followUp.message || "Follow-up action",
      detail: followUp.status || "Open",
      date: followUp.created_at,
      href: "/follow-ups",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);
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

  const [
    customersResult,
    leadsResult,
    jobsResult,
    salesResult,
    followUpsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone, address, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("leads")
      .select(
        "id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("jobs")
      .select(
        "id, customer_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("sales")
      .select(
        "id, amount, payment_status, sale_date, service_type, source, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("follow_ups")
      .select("id, message, due_date, status, created_at")
      .eq("company_id", company.id)
      .order("due_date", { ascending: true })
      .limit(100),
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

  const customers = customersResult.data || [];
  const leads = leadsResult.data || [];
  const jobs = jobsResult.data || [];
  const sales = salesResult.data || [];
  const followUps = followUpsResult.data || [];

  const openLeads = leads.filter((lead) => {
    const status = String(lead.status || "").toLowerCase();
    return !status.includes("won") && !status.includes("lost");
  });

  const openOpportunityValue = openLeads.reduce(
    (sum, lead) => sum + Number(lead.estimated_value || 0),
    0,
  );

  const activeJobs = jobs.filter((job) => {
    const status = String(job.status || "").toLowerCase();
    return (
      !status.includes("complete") &&
      !status.includes("cancel") &&
      !status.includes("done")
    );
  });

  const unpaidSales = sales.filter((sale) => {
    const status = String(sale.payment_status || "").toLowerCase();
    return status.includes("unpaid") || status.includes("partial");
  });

  const unpaidRevenue = unpaidSales.reduce(
    (sum, sale) => sum + Number(sale.amount || 0),
    0,
  );

  const dueActions = followUps.filter(
    (followUp) =>
      isTodayOrPast(followUp.due_date) &&
      !String(followUp.status || "")
        .toLowerCase()
        .includes("complete") &&
      !String(followUp.status || "")
        .toLowerCase()
        .includes("done"),
  );

  const missingContact = customers.filter(
    (customer) => !customer.phone && !customer.email,
  );
  const missingAddress = customers.filter((customer) => !customer.address);

  const estimatesWithoutCustomer = leads.filter((lead) => !lead.customer_id);

  const estimatesMissingSource = leads.filter((lead) => !lead.source);

  const estimatesMissingValue = leads.filter(
    (lead) =>
      lead.estimated_value === null || lead.estimated_value === undefined,
  );

  const projectsMissingValue = jobs.filter(
    (job) => job.job_value === null || job.job_value === undefined,
  );

  const paymentsMissingSource = sales.filter((sale) => !sale.source);

  const actionsNotConnected: typeof followUps = [];
  const attentionGroups = [
    {
      id: "due-actions",
      label: "Follow-ups due",
      title: "Follow-ups need attention",
      detail: "Open follow-ups are due today or overdue.",
      count: dueActions.length,
      href: "/follow-ups",
      cta: "Review follow-ups",
      tone: "warning" as const,
    },
    {
      id: "unpaid-revenue",
      label: "Payment needed",
      title: "Revenue needs collection",
      detail: "Unpaid or partially paid records should be reviewed.",
      count: unpaidSales.length,
      href: "/sales",
      cta: "Review revenue",
      tone: "danger" as const,
    },
    {
      id: "missing-contact",
      label: "Add contact",
      title: "People need contact details",
      detail: "Records without phone or email are harder to follow up with.",
      count: missingContact.length,
      href: "/customers",
      cta: "Review people",
      tone: "neutral" as const,
    },
    {
      id: "missing-address",
      label: "Add address",
      title: "People need addresses",
      detail:
        "Addresses help with service area, job planning, and local context.",
      count: missingAddress.length,
      href: "/customers",
      cta: "Review people",
      tone: "neutral" as const,
    },
    {
      id: "opportunities-without-customer",
      label: "Link opportunity",
      title: "Opportunities need a person or business",
      detail: "Pipeline records should usually be connected to someone.",
      count: estimatesWithoutCustomer.length,
      href: "/leads",
      cta: "Review opportunities",
      tone: "neutral" as const,
    },
    {
      id: "opportunities-missing-source",
      label: "Add source",
      title: "Opportunities need sources",
      detail:
        "Source tracking helps show which marketing channels are working.",
      count: estimatesMissingSource.length,
      href: "/leads",
      cta: "Review opportunities",
      tone: "neutral" as const,
    },
    {
      id: "opportunities-missing-estimate",
      label: "Add estimate",
      title: "Opportunities need estimated values",
      detail:
        "Estimated value helps prioritize the most important opportunities.",
      count: estimatesMissingValue.length,
      href: "/leads",
      cta: "Review opportunities",
      tone: "neutral" as const,
    },
    {
      id: "work-missing-value",
      label: "Add work value",
      title: "Work records need values",
      detail: "Work value helps reporting reflect active and completed work.",
      count: projectsMissingValue.length,
      href: "/jobs",
      cta: "Review work",
      tone: "neutral" as const,
    },
    {
      id: "revenue-missing-source",
      label: "Add revenue source",
      title: "Revenue needs sources",
      detail: "Revenue source helps show what generated paid work.",
      count: paymentsMissingSource.length,
      href: "/sales",
      cta: "Review revenue",
      tone: "neutral" as const,
    },
    {
      id: "followups-not-connected",
      label: "Link follow-up",
      title: "Follow-ups need connections",
      detail:
        "Follow-ups should usually connect to a person, opportunity, or work record.",
      count: actionsNotConnected.length,
      href: "/follow-ups",
      cta: "Review follow-ups",
      tone: "neutral" as const,
    },
  ].filter((item) => item.count > 0);

  const attentionCount = attentionGroups.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const recentItems = getRecentItems({
    customers,
    leads,
    jobs,
    sales,
    followUps,
    labels: profile.labels,
  });

  const nextActions = followUps
    .filter(
      (item) =>
        !String(item.status || "")
          .toLowerCase()
          .includes("complete") &&
        !String(item.status || "")
          .toLowerCase()
          .includes("done"),
    )
    .slice(0, 5);

  const prioritizedOpportunities = [...openLeads]
    .sort((a, b) => {
      const aNeedsFollowUp =
        !a.next_follow_up_date || isTodayOrPast(a.next_follow_up_date);
      const bNeedsFollowUp =
        !b.next_follow_up_date || isTodayOrPast(b.next_follow_up_date);

      if (aNeedsFollowUp !== bNeedsFollowUp) {
        return aNeedsFollowUp ? -1 : 1;
      }

      return Number(b.estimated_value || 0) - Number(a.estimated_value || 0);
    })
    .slice(0, 5);

  const opportunitiesNeedingFollowUp = openLeads.filter(
    (lead) =>
      !lead.next_follow_up_date || isTodayOrPast(lead.next_follow_up_date),
  ).length;
  const latestWork = activeJobs.slice(0, 5);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Home"
          title="What needs attention"
          description="Start here each day to see follow-ups, open opportunities, active work, unpaid revenue, and missing business details."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/imports"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Import data
              </Link>

              <Link
                href="/ai-assistant"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                AI brief
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Needs attention"
            value={attentionCount}
            helper="Follow-ups, payments, and cleanup issues"
            tone={attentionCount > 0 ? "warning" : "positive"}
          />

          <StatCard
            label="Open pipeline"
            value={formatCurrency(openOpportunityValue)}
            helper={`${openLeads.length} open opportunities`}
            tone={openOpportunityValue > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Active work"
            value={activeJobs.length}
            helper="Work not yet complete"
          />

          <StatCard
            label="Unpaid revenue"
            value={formatCurrency(unpaidRevenue)}
            helper={`${unpaidSales.length} records need collection`}
            tone={unpaidRevenue > 0 ? "danger" : "positive"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr] items-start">
          <SectionCard
            title="Needs attention"
            description="Grouped issues that may need follow-up, cleanup, or a decision."
          >
            {attentionGroups.length === 0 ? (
              <EmptyState
                title="Nothing needs attention"
                description="No overdue follow-ups, unpaid revenue, or missing key details were found."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {attentionGroups.slice(0, 8).map((item) => (
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
                      {item.cta}
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Follow-ups"
            description="Open reminders and next steps."
          >
            {nextActions.length === 0 ? (
              <EmptyState
                title="No follow-ups yet"
                description="Add reminders for callbacks, next steps, and work that needs attention."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {nextActions.map((action) => (
                  <article key={action.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {action.message || "Follow up"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Due {formatDate(action.due_date)}
                        </p>
                      </div>

                      <StatusBadge tone={getStatusTone(action.status)}>
                        {action.status || "Open"}
                      </StatusBadge>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2 items-start">
          <SectionCard
            title="Open opportunities"
            description="Potential business that needs follow-up, a decision, or movement."
          >
            {prioritizedOpportunities.length === 0 ? (
              <EmptyState
                title="No open opportunities"
                description="New opportunities will appear here when they are added or imported."
              />
            ) : (
              <div>
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {opportunitiesNeedingFollowUp} need follow-up attention
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Prioritized by missing follow-up, due date, and estimated
                      value.
                    </p>
                  </div>

                  <Link
                    href="/crm"
                    className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Open pipeline
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {prioritizedOpportunities.map((lead) => (
                    <article
                      key={lead.id}
                      className="grid gap-3 p-4 md:grid-cols-[1fr_120px_150px_120px] md:items-center"
                    >
                      <div>
                        <p className="font-semibold text-slate-950">
                          {lead.service_requested || "Untitled opportunity"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {lead.source || "No source saved"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Value
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatCurrency(lead.estimated_value)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Next step
                        </p>
                        <div className="mt-1">
                          <StatusBadge
                            tone={getFollowUpTone(lead.next_follow_up_date)}
                          >
                            {getFollowUpLabel(lead.next_follow_up_date)}
                          </StatusBadge>
                        </div>
                      </div>

                      <div className="md:text-right">
                        <StatusBadge tone={getStatusTone(lead.status)}>
                          {lead.status || "Open"}
                        </StatusBadge>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={`Active ${profile.labels.jobPlural.toLowerCase()}`}
            description="Work that is scheduled, active, or not yet complete."
          >
            {latestWork.length === 0 ? (
              <EmptyState
                title={`No active ${profile.labels.jobPlural.toLowerCase()}`}
                description="Scheduled or active work will appear here."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {latestWork.map((job) => (
                  <article
                    key={job.id}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_110px_120px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {job.service_type || "Untitled work"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Starts {formatDate(job.start_date)}
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-slate-700">
                      {formatCurrency(job.job_value)}
                    </p>

                    <div className="md:text-right">
                      <StatusBadge tone={getStatusTone(job.status)}>
                        {job.status || "Active"}
                      </StatusBadge>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <SectionCard
          title="Recently added records"
          description="Newest records added across people, opportunities, work, revenue, and follow-ups."
        >
          {recentItems.length === 0 ? (
            <EmptyState
              title="No records added yet"
              description="Import data or add records to start building the workspace."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentItems.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-3 p-4 md:grid-cols-[130px_1fr_120px] md:items-center"
                >
                  <div>
                    <StatusBadge tone="neutral">{item.type}</StatusBadge>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                  </div>

                  <div className="md:text-right">
                    <p className="text-xs font-medium text-slate-500">Added</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatDate(item.date)}
                    </p>
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
