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
import { formatDateOnly, formatTimestampDate, isTodayOrPast } from "@/lib/date-format";
import { formatCurrency } from "@/lib/utils";
import {
  isClosedOpportunity,
  isCompleteWork,
  isCancelledWork,
  isUnpaid,
  isOpenFollowUp,
} from "@/lib/status";
import { getIndustryProfile } from "@/lib/industry-profiles";

type CustomerRecord = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  customer_type: string | null;
  created_at: string;
};

type OpportunityRecord = {
  id: string;
  customer_id: string | null;
  service_requested: string | null;
  status: string | null;
  estimated_value: number | null;
  source: string | null;
  next_follow_up_date: string | null;
  created_at: string;
};

type WorkRecord = {
  id: string;
  customer_id: string | null;
  lead_id: string | null;
  service_type: string | null;
  status: string | null;
  job_value: number | null;
  start_date: string | null;
  completed_date: string | null;
  paid_status: string | null;
  created_at: string;
};

type RevenueRecord = {
  id: string;
  amount: number | null;
  payment_status: string | null;
  sale_date: string | null;
  service_type: string | null;
  source: string | null;
  created_at: string;
};

type FollowUpRecord = {
  id: string;
  customer_id: string | null;
  message: string | null;
  due_date: string | null;
  status: string | null;
  created_at: string;
};

type CleanupItem = {
  id: string;
  area: string;
  label: string;
  title: string;
  detail: string;
  count: number;
  href: string;
  tone: "success" | "warning" | "danger" | "neutral";
};

type RecentRecord = {
  id: string;
  type: string;
  title: string;
  detail: string;
  date: string;
  href: string;
};

function getHealthTone(score: number) {
  if (score >= 90) {
    return "positive" as const;
  }

  if (score >= 70) {
    return "warning" as const;
  }

  return "danger" as const;
}

function getIssueTone(count: number) {
  return count > 0 ? ("warning" as const) : ("success" as const);
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
    opportunitiesResult,
    workResult,
    revenueResult,
    followUpsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email, address, customer_type, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(500),

    supabase
      .from("leads")
      .select(
        "id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(500),

    supabase
      .from("jobs")
      .select(
        "id, customer_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(500),

    supabase
      .from("sales")
      .select(
        "id, amount, payment_status, sale_date, service_type, source, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(500),

    supabase
      .from("follow_ups")
      .select("id, customer_id, message, due_date, status, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (customersResult.error) {
    throw new Error(customersResult.error.message);
  }

  if (opportunitiesResult.error) {
    throw new Error(opportunitiesResult.error.message);
  }

  if (workResult.error) {
    throw new Error(workResult.error.message);
  }

  if (revenueResult.error) {
    throw new Error(revenueResult.error.message);
  }

  if (followUpsResult.error) {
    throw new Error(followUpsResult.error.message);
  }

  const customers = (customersResult.data || []) as CustomerRecord[];
  const opportunities = (opportunitiesResult.data || []) as OpportunityRecord[];
  const workRecords = (workResult.data || []) as WorkRecord[];
  const revenueRecords = (revenueResult.data || []) as RevenueRecord[];
  const followUps = (followUpsResult.data || []) as FollowUpRecord[];

  const openOpportunities = opportunities.filter(
    (opportunity) => !isClosedOpportunity(opportunity.status),
  );

  const activeWork = workRecords.filter(
    (work) => !isCompleteWork(work.status) && !isCancelledWork(work.status),
  );

  const openFollowUps = followUps.filter(
    (followUp) => isOpenFollowUp(followUp.status),
  );

  const customersMissingContact = customers.filter(
    (customer) => !customer.phone || !customer.email,
  );

  const customersMissingAddress = customers.filter(
    (customer) => !customer.address,
  );

  const customersMissingType = customers.filter(
    (customer) => !customer.customer_type,
  );

  const opportunitiesMissingPerson = openOpportunities.filter(
    (opportunity) => !opportunity.customer_id,
  );

  const opportunitiesMissingSource = openOpportunities.filter(
    (opportunity) => !opportunity.source,
  );

  const opportunitiesMissingValue = openOpportunities.filter(
    (opportunity) =>
      opportunity.estimated_value === null ||
      opportunity.estimated_value === undefined,
  );

  const opportunitiesNeedFollowUp = openOpportunities.filter(
    (opportunity) =>
      !opportunity.next_follow_up_date ||
      isTodayOrPast(opportunity.next_follow_up_date),
  );

  const workMissingPerson = workRecords.filter((work) => !work.customer_id);

  const workMissingOpportunity = workRecords.filter((work) => !work.lead_id);

  const workMissingValue = workRecords.filter(
    (work) => work.job_value === null || work.job_value === undefined,
  );

  const workMissingStartDate = activeWork.filter((work) => !work.start_date);

  const revenueMissingAmount = revenueRecords.filter(
    (record) => record.amount === null || record.amount === undefined,
  );

  const revenueMissingSource = revenueRecords.filter(
    (record) => !record.source,
  );

  const revenueMissingDate = revenueRecords.filter(
    (record) => !record.sale_date,
  );

  const unpaidRevenue = revenueRecords.filter((record) =>
    isUnpaid(record.payment_status),
  );

  const followUpsMissingPerson = openFollowUps.filter(
    (followUp) => !followUp.customer_id,
  );

  const followUpsMissingDueDate = openFollowUps.filter(
    (followUp) => !followUp.due_date,
  );

  const totalRecords =
    customers.length +
    opportunities.length +
    workRecords.length +
    revenueRecords.length +
    followUps.length;

  const totalIssues =
    customersMissingContact.length +
    customersMissingAddress.length +
    customersMissingType.length +
    opportunitiesMissingPerson.length +
    opportunitiesMissingSource.length +
    opportunitiesMissingValue.length +
    opportunitiesNeedFollowUp.length +
    workMissingPerson.length +
    workMissingOpportunity.length +
    workMissingValue.length +
    workMissingStartDate.length +
    revenueMissingAmount.length +
    revenueMissingSource.length +
    revenueMissingDate.length +
    followUpsMissingPerson.length +
    followUpsMissingDueDate.length;

  const healthScore =
    totalRecords === 0
      ? 100
      : Math.max(0, Math.round(100 - (totalIssues / totalRecords) * 18));

  const openPipelineValue = openOpportunities.reduce(
    (sum, opportunity) => sum + Number(opportunity.estimated_value || 0),
    0,
  );

  const activeWorkValue = activeWork.reduce(
    (sum, work) => sum + Number(work.job_value || 0),
    0,
  );

  const unpaidRevenueValue = unpaidRevenue.reduce(
    (sum, record) => sum + Number(record.amount || 0),
    0,
  );

  const cleanupItems: CleanupItem[] = [
    {
      id: "customers-missing-contact",
      area: profile.labels.customerPlural,
      label: "Add contact",
      title: `${profile.labels.customerPlural} with incomplete contact info`,
      detail: "These records are missing either phone or email.",
      count: customersMissingContact.length,
      href: "/customers",
      tone: getIssueTone(customersMissingContact.length),
    },
    {
      id: "customers-missing-address",
      area: profile.labels.customerPlural,
      label: "Add address",
      title: `${profile.labels.customerPlural} missing addresses`,
      detail:
        "Addresses help with service areas, job planning, and local context.",
      count: customersMissingAddress.length,
      href: "/customers",
      tone: getIssueTone(customersMissingAddress.length),
    },
    {
      id: "customers-missing-type",
      area: profile.labels.customerPlural,
      label: "Add type",
      title: `${profile.labels.customerPlural} missing types`,
      detail: "Types help separate customers, leads, vendors, and accounts.",
      count: customersMissingType.length,
      href: "/customers",
      tone: getIssueTone(customersMissingType.length),
    },
    {
      id: "opportunities-missing-person",
      area: profile.labels.leadPlural,
      label: "Link person",
      title: "Opportunities not connected to people",
      detail:
        "Pipeline records should usually connect to a person or business.",
      count: opportunitiesMissingPerson.length,
      href: "/leads",
      tone: getIssueTone(opportunitiesMissingPerson.length),
    },
    {
      id: "opportunities-missing-source",
      area: profile.labels.leadPlural,
      label: "Add source",
      title: "Opportunities missing sources",
      detail: "Source tracking helps show what marketing is working.",
      count: opportunitiesMissingSource.length,
      href: "/leads",
      tone: getIssueTone(opportunitiesMissingSource.length),
    },
    {
      id: "opportunities-missing-value",
      area: profile.labels.leadPlural,
      label: "Add estimate",
      title: "Opportunities missing estimated value",
      detail:
        "Estimated value helps prioritize the most important pipeline records.",
      count: opportunitiesMissingValue.length,
      href: "/leads",
      tone: getIssueTone(opportunitiesMissingValue.length),
    },
    {
      id: "opportunities-follow-up",
      area: profile.labels.leadPlural,
      label: "Follow up",
      title: "Opportunities need follow-up attention",
      detail: "These are missing, due, or overdue next follow-up dates.",
      count: opportunitiesNeedFollowUp.length,
      href: "/follow-ups?source=opportunity",
      tone: getIssueTone(opportunitiesNeedFollowUp.length),
    },
    {
      id: "work-missing-person",
      area: profile.labels.jobPlural,
      label: "Link person",
      title: "Work not connected to people",
      detail: "Work records should usually connect to whoever the work is for.",
      count: workMissingPerson.length,
      href: "/jobs",
      tone: getIssueTone(workMissingPerson.length),
    },
    {
      id: "work-missing-opportunity",
      area: profile.labels.jobPlural,
      label: "Link opportunity",
      title: "Work not connected to opportunities",
      detail: "Linking work to opportunities keeps the lifecycle connected.",
      count: workMissingOpportunity.length,
      href: "/jobs",
      tone: getIssueTone(workMissingOpportunity.length),
    },
    {
      id: "work-missing-value",
      area: profile.labels.jobPlural,
      label: "Add value",
      title: "Work records missing value",
      detail: "Work value supports active and completed work reporting.",
      count: workMissingValue.length,
      href: "/jobs",
      tone: getIssueTone(workMissingValue.length),
    },
    {
      id: "work-missing-start",
      area: profile.labels.jobPlural,
      label: "Add start date",
      title: "Active work missing start dates",
      detail: "Start dates help with scheduling and operational planning.",
      count: workMissingStartDate.length,
      href: "/jobs",
      tone: getIssueTone(workMissingStartDate.length),
    },
    {
      id: "revenue-missing-amount",
      area: profile.labels.salePlural,
      label: "Add amount",
      title: "Revenue missing amounts",
      detail: "Amounts are required for accurate revenue reporting.",
      count: revenueMissingAmount.length,
      href: "/sales",
      tone: getIssueTone(revenueMissingAmount.length),
    },
    {
      id: "revenue-missing-source",
      area: profile.labels.salePlural,
      label: "Add source",
      title: "Revenue missing sources",
      detail: "Sources help show what generated paid work.",
      count: revenueMissingSource.length,
      href: "/sales",
      tone: getIssueTone(revenueMissingSource.length),
    },
    {
      id: "revenue-missing-date",
      area: profile.labels.salePlural,
      label: "Add date",
      title: "Revenue missing dates",
      detail: "Revenue dates keep records in the correct reporting period.",
      count: revenueMissingDate.length,
      href: "/sales",
      tone: getIssueTone(revenueMissingDate.length),
    },
    {
      id: "follow-ups-missing-person",
      area: profile.labels.followUpPlural,
      label: "Link person",
      title: "Follow-ups not connected to people",
      detail: "Follow-ups are more useful when tied to who they are for.",
      count: followUpsMissingPerson.length,
      href: "/follow-ups",
      tone: getIssueTone(followUpsMissingPerson.length),
    },
    {
      id: "follow-ups-missing-date",
      area: profile.labels.followUpPlural,
      label: "Add due date",
      title: "Follow-ups missing due dates",
      detail: "Due dates make the priority queue sort correctly.",
      count: followUpsMissingDueDate.length,
      href: "/follow-ups?due=missing",
      tone: getIssueTone(followUpsMissingDueDate.length),
    },
  ];

  const activeCleanupItems = cleanupItems
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const cleanCleanupItems = cleanupItems.filter((item) => item.count === 0);

  const moduleSummaries = [
    {
      id: "people",
      title: profile.labels.customerPlural,
      href: "/customers",
      count: customers.length,
      issues:
        customersMissingContact.length +
        customersMissingAddress.length +
        customersMissingType.length,
      detail: "Customers, contacts, businesses, and accounts.",
    },
    {
      id: "opportunities",
      title: profile.labels.leadPlural,
      href: "/leads",
      count: opportunities.length,
      issues:
        opportunitiesMissingPerson.length +
        opportunitiesMissingSource.length +
        opportunitiesMissingValue.length +
        opportunitiesNeedFollowUp.length,
      detail: `${formatCurrency(openPipelineValue)} open pipeline value.`,
    },
    {
      id: "work",
      title: profile.labels.jobPlural,
      href: "/jobs",
      count: workRecords.length,
      issues:
        workMissingPerson.length +
        workMissingOpportunity.length +
        workMissingValue.length +
        workMissingStartDate.length,
      detail: `${formatCurrency(activeWorkValue)} active work value.`,
    },
    {
      id: "revenue",
      title: profile.labels.salePlural,
      href: "/sales",
      count: revenueRecords.length,
      issues:
        revenueMissingAmount.length +
        revenueMissingSource.length +
        revenueMissingDate.length +
        unpaidRevenue.length,
      detail: `${formatCurrency(unpaidRevenueValue)} needs payment review.`,
    },
    {
      id: "follow-ups",
      title: profile.labels.followUpPlural,
      href: "/follow-ups",
      count: followUps.length,
      issues: followUpsMissingPerson.length + followUpsMissingDueDate.length,
      detail: `${openFollowUps.length} open manual follow-ups.`,
    },
  ];

  const recentRecords: RecentRecord[] = [
    ...customers.map((customer) => ({
      id: `customer-${customer.id}`,
      type: profile.labels.customerSingular,
      title: customer.name || "Unnamed person",
      detail: customer.email || customer.phone || "Incomplete contact saved",
      date: customer.created_at,
      href: `/customers/${customer.id}/edit`,
    })),
    ...opportunities.map((opportunity) => ({
      id: `opportunity-${opportunity.id}`,
      type: profile.labels.leadSingular,
      title: opportunity.service_requested || "Untitled opportunity",
      detail: opportunity.next_follow_up_date
        ? `Follow up ${formatDateOnly(opportunity.next_follow_up_date)}`
        : opportunity.source || "No follow-up saved",
      date: opportunity.created_at,
      href: `/leads/${opportunity.id}/edit`,
    })),
    ...workRecords.map((work) => ({
      id: `work-${work.id}`,
      type: profile.labels.jobSingular,
      title: work.service_type || "Untitled work",
      detail: work.start_date
        ? `Starts ${formatDateOnly(work.start_date)}`
        : work.status || "No start date saved",
      date: work.created_at,
      href: `/jobs/${work.id}/edit`,
    })),
    ...revenueRecords.map((record) => ({
      id: `revenue-${record.id}`,
      type: profile.labels.saleSingular,
      title: formatCurrency(record.amount),
      detail: record.sale_date
        ? `Revenue date ${formatDateOnly(record.sale_date)}`
        : record.payment_status || "No date saved",
      date: record.created_at,
      href: `/sales/${record.id}/edit`,
    })),
    ...followUps.map((followUp) => ({
      id: `follow-up-${followUp.id}`,
      type: "Follow-up",
      title: followUp.message || "Follow up",
      detail: followUp.due_date
        ? `Due ${formatDateOnly(followUp.due_date)}`
        : followUp.status || "No due date saved",
      date: followUp.created_at,
      href: `/follow-ups/${followUp.id}/edit`,
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
      businessSector={company.business_sector}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Data Hub"
          title={`Check data quality across your ${profile.labels.customerPlural.toLowerCase()}, ${profile.labels.leadPlural.toLowerCase()}, and ${profile.labels.jobPlural.toLowerCase()}`}
          description="See what data is clean, what needs cleanup, and where imported or manual records need attention."
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
                Home
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Data health"
            value={`${healthScore}%`}
            helper={`${totalIssues} cleanup issues across ${totalRecords} records`}
            tone={getHealthTone(healthScore)}
          />

          <StatCard
            label="Total records"
            value={totalRecords}
            helper={`${profile.labels.customerPlural.toLowerCase()}, ${profile.labels.leadPlural.toLowerCase()}, ${profile.labels.jobPlural.toLowerCase()}, ${profile.labels.salePlural.toLowerCase()}, and ${profile.labels.followUpPlural.toLowerCase()}`}
            tone={totalRecords > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Open pipeline"
            value={formatCurrency(openPipelineValue)}
            helper={`${openOpportunities.length} open opportunities`}
            tone={openPipelineValue > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Payment review"
            value={formatCurrency(unpaidRevenueValue)}
            helper={`${unpaidRevenue.length} unpaid or partial records`}
            tone={unpaidRevenue.length > 0 ? "danger" : "positive"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <SectionCard
            title="Cleanup queue"
            description="The most important data issues to clean up first."
          >
            {activeCleanupItems.length === 0 ? (
              <EmptyState
                title="Data looks clean"
                description="No major cleanup issues were found across the workspace."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {activeCleanupItems.map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-4 p-4 md:grid-cols-[130px_1fr_90px_90px] md:items-center"
                  >
                    <div>
                      <StatusBadge tone={item.tone}>{item.area}</StatusBadge>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-950">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {item.detail}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-lg font-semibold text-slate-950">
                        {item.count}
                      </p>
                      <p className="text-xs text-slate-500">records</p>
                    </div>

                    <div className="md:text-right">
                      <Link
                        href={item.href}
                        className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Review
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Modules"
            description="Record count and cleanup pressure by area."
          >
            <div className="divide-y divide-slate-100">
              {moduleSummaries.map((module) => (
                <article
                  key={module.id}
                  className="grid gap-3 p-4 md:grid-cols-[1fr_90px] md:items-center"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {module.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {module.detail}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge
                        tone={module.count > 0 ? "success" : "neutral"}
                      >
                        {module.count} records
                      </StatusBadge>

                      <StatusBadge
                        tone={module.issues > 0 ? "warning" : "success"}
                      >
                        {module.issues} issues
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="md:text-right">
                    <Link
                      href={module.href}
                      className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Open
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        </section>

        <SectionCard
          title="Clean checks"
          description="Areas currently reporting no issues."
        >
          {cleanCleanupItems.length === 0 ? (
            <EmptyState
              title="No clean checks yet"
              description="Once issue groups reach zero, they will appear here."
            />
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
              {cleanCleanupItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <StatusBadge tone="success">{item.label}</StatusBadge>

                  <p className="mt-3 font-semibold text-slate-950">
                    {item.title}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    No records currently need this cleanup.
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Recently added data"
          description="Newest records across every module."
        >
          {recentRecords.length === 0 ? (
            <EmptyState
              title="No records yet"
              description="Import data or add records manually to start building the workspace."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentRecords.map((record) => (
                <article
                  key={record.id}
                  className="grid gap-3 p-4 md:grid-cols-[120px_1fr_120px_90px] md:items-center"
                >
                  <div>
                    <StatusBadge tone="neutral">{record.type}</StatusBadge>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-950">
                      {record.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {record.detail}
                    </p>
                  </div>

                  <p className="text-sm font-medium text-slate-500 md:text-right">
                    {formatTimestampDate(record.date)}
                  </p>

                  <div className="md:text-right">
                    <Link
                      href={record.href}
                      className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Open
                    </Link>
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

