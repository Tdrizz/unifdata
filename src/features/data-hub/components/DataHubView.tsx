import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateOnly, formatTimestampDate, isTodayOrPast } from "@/lib/date-format";
import { formatCurrency } from "@/lib/utils";
import {
  isClosedOpportunity,
  isCompleteWork,
  isCancelledWork,
  isUnpaid,
  isOpenFollowUp,
  computeHealthScore,
} from "@/lib/status";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { OrphanQuickLink } from "@/app/data-hub/OrphanQuickLink";
import { DataHealthRing } from "@/app/workspace/RevenueChart";
import type { OrphanGroup } from "@/app/data-hub/OrphanQuickLink";
import type { DataHubPageData } from "../queries";

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

function getIssueTone(count: number) {
  return count > 0 ? ("warning" as const) : ("success" as const);
}

type Props = DataHubPageData & {
  profile: IndustryProfile;
};

export function DataHubView({
  customers,
  opportunities,
  workRecords,
  revenueRecords,
  followUps,
  profile,
}: Props) {
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

  const criticalIssues =
    opportunitiesMissingPerson.length +
    workMissingPerson.length +
    revenueMissingAmount.length;

  const importantIssues =
    opportunitiesMissingValue.length +
    opportunitiesNeedFollowUp.length +
    workMissingValue.length +
    followUpsMissingDueDate.length;

  const cosmeticIssues =
    customersMissingContact.length +
    customersMissingAddress.length +
    customersMissingType.length +
    opportunitiesMissingSource.length +
    workMissingOpportunity.length +
    workMissingStartDate.length +
    revenueMissingSource.length +
    revenueMissingDate.length +
    followUpsMissingPerson.length;

  const healthScore = computeHealthScore(criticalIssues, importantIssues, cosmeticIssues, totalRecords);

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

  // Build orphan quick-link groups: jobs missing lead_id where we can suggest a lead
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const leadsByCustomer = new Map<string, typeof opportunities[number][]>();
  for (const opp of opportunities) {
    if (!opp.customer_id) continue;
    if (!leadsByCustomer.has(opp.customer_id)) {
      leadsByCustomer.set(opp.customer_id, []);
    }
    leadsByCustomer.get(opp.customer_id)!.push(opp);
  }

  const orphanJobsByCustomer = new Map<string, typeof workRecords[number][]>();
  for (const work of workRecords) {
    if (work.lead_id || !work.customer_id) continue;
    if (!orphanJobsByCustomer.has(work.customer_id)) {
      orphanJobsByCustomer.set(work.customer_id, []);
    }
    orphanJobsByCustomer.get(work.customer_id)!.push(work);
  }

  const orphanGroups: OrphanGroup[] = [];
  for (const [customerId, jobs] of orphanJobsByCustomer) {
    const customer = customerById.get(customerId);
    const customerLeads = leadsByCustomer.get(customerId) ?? [];
    if (!customer || customerLeads.length === 0) continue;

    let bestLead: typeof customerLeads[number] | null = null;
    let bestScore = 0;
    for (const lead of customerLeads) {
      const leadText = (lead.service_requested ?? "").toLowerCase();
      const matchCount = jobs.filter((j) => {
        const jobWords = (j.service_type ?? "").toLowerCase().split(/\s+/);
        return jobWords.some((w) => w.length > 2 && leadText.includes(w));
      }).length;
      const score = matchCount / jobs.length;
      if (score > bestScore || bestLead === null) {
        bestScore = score;
        bestLead = lead;
      }
    }

    orphanGroups.push({
      customer_id: customerId,
      customer_name: customer.name ?? "Unknown customer",
      jobs: jobs.map((j) => ({ id: j.id, service_type: j.service_type })),
      suggested_lead: bestLead
        ? { id: bestLead.id, service_requested: bestLead.service_requested }
        : null,
    });
  }

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
    <div className="space-y-5 px-4 md:px-6 pt-5 pb-8">
      <PageHeader
        eyebrow="Data Hub"
        title="Record quality"
        description="UnifData scans your workspace and surfaces records that need attention before they become problems."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/imports"
              className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk"
            >
              Import data
            </Link>
            <Link
              href="/workspace"
              className="rounded-[10px] bg-ud-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Home
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_2fr] items-start">
        {/* Workspace health card */}
        <div className="rounded-[14px] border border-ud bg-ud-surface p-5 shadow-ud">
          <p className="text-sm font-semibold text-ud-faint">Workspace health</p>
          <div className="mt-4 flex justify-center">
            <DataHealthRing score={healthScore} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-[10px] border border-ud bg-ud-surface-sunk p-3">
              <p className="text-lg font-semibold text-ud-ink">{totalRecords}</p>
              <p className="mt-0.5 text-xs text-ud-faint">Total records</p>
            </div>
            <div className="rounded-[10px] border border-ud bg-ud-surface-sunk p-3">
              <p className="text-lg font-semibold text-ud-ink">{totalIssues}</p>
              <p className="mt-0.5 text-xs text-ud-faint">Issues found</p>
            </div>
          </div>
        </div>

        {/* Needs attention list */}
        <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud">
          <div className="border-b border-ud px-5 py-4">
            <p className="font-semibold text-ud-ink">Needs attention</p>
            <p className="mt-0.5 text-sm text-ud-faint">Top data issues by record count.</p>
          </div>
          {activeCleanupItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ud-faint">All records look clean.</div>
          ) : (
            <div>
              {activeCleanupItems.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ud-ink">{item.title}</p>
                    <p className="text-xs text-ud-faint">{item.area}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      {item.count}
                    </span>
                    <Link
                      href={item.href}
                      className="text-xs font-semibold text-[#4A3FA8] hover:underline"
                    >
                      Review →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <OrphanQuickLink groups={orphanGroups} />

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
            <div>
              {activeCleanupItems.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 p-4 md:grid-cols-[130px_1fr_90px_90px] md:items-center"
                >
                  <div>
                    <StatusBadge tone={item.tone}>{item.area}</StatusBadge>
                  </div>

                  <div>
                    <p className="font-semibold text-ud-ink">
                      {item.title}
                    </p>
                    <p className="hidden md:block mt-1 text-sm leading-6 text-ud-faint">
                      {item.detail}
                    </p>
                  </div>

                  <div className="md:text-right">
                    <p className="text-lg font-semibold text-ud-ink">
                      {item.count}
                    </p>
                    <p className="text-xs text-ud-faint">records</p>
                  </div>

                  <div className="md:text-right">
                    <Link
                      href={item.href}
                      className="inline-flex rounded-xl border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-soft"
                    >
                      Review
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="hidden md:block">
        <SectionCard
          title="Modules"
          description="Record count and cleanup pressure by area."
        >
          <div>
            {moduleSummaries.map((module) => (
              <article
                key={module.id}
                className="grid gap-3 p-4 md:grid-cols-[1fr_90px] md:items-center"
              >
                <div>
                  <p className="font-semibold text-ud-ink">
                    {module.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ud-faint">
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
                    className="inline-flex rounded-xl border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-soft"
                  >
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
        </div>
      </section>

      <div className="hidden md:block">
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
                className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4"
              >
                <StatusBadge tone="success">{item.label}</StatusBadge>

                <p className="mt-3 font-semibold text-ud-ink">
                  {item.title}
                </p>

                <p className="mt-1 text-sm leading-6 text-ud-faint">
                  No records currently need this cleanup.
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      </div>

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
          <div>
            {recentRecords.map((record) => (
              <article
                key={record.id}
                className="grid gap-3 p-4 md:grid-cols-[120px_1fr_120px_90px] md:items-center"
              >
                <div>
                  <StatusBadge tone="neutral">{record.type}</StatusBadge>
                </div>

                <div>
                  <p className="font-semibold text-ud-ink">
                    {record.title}
                  </p>
                  <p className="mt-1 text-sm text-ud-faint">
                    {record.detail}
                  </p>
                </div>

                <p className="text-sm font-medium text-ud-faint md:text-right">
                  {formatTimestampDate(record.date)}
                </p>

                <div className="md:text-right">
                  <Link
                    href={record.href}
                    className="inline-flex rounded-xl border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-soft"
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
  );
}
