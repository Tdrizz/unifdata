import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { RefreshButton } from "@/app/workspace/RefreshButton";
import { RevenueLineChart, DataHealthRing, computeMonthlyRevenue } from "@/app/workspace/RevenueChart";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  formatDateOnly,
  formatTimestampDate,
  parseDateOnly,
  isTodayOrPast,
  isOverdue,
  isDueToday,
} from "@/lib/date-format";
import { formatCurrency } from "@/lib/utils";
import {
  isClosedOpportunity,
  isUnpaid,
  isOpenFollowUp,
  isRecentActiveWork,
  getWorkTone,
  computeHealthScore,
} from "@/lib/status";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { WorkspaceData } from "../queries";

type QueueItem = {
  id: string;
  label: string;
  title: string;
  detail: string;
  href: string;
  tone: "success" | "warning" | "danger" | "neutral";
  due_date?: string | null;
  priority: number;
};

function getSortDate(date: string | null | undefined, fallback: string) {
  const parsed = parseDateOnly(date || null);
  if (parsed) return parsed.getTime();
  return new Date(fallback).getTime();
}

function getFollowUpLabel(date: string | null) {
  if (!date) return "No due date";
  if (isOverdue(date)) return `Overdue ${formatDateOnly(date)}`;
  if (isDueToday(date)) return "Due today";
  return `Due ${formatDateOnly(date)}`;
}

function getFollowUpTone(date: string | null) {
  if (!date) return "neutral" as const;
  if (isOverdue(date)) return "danger" as const;
  if (isDueToday(date)) return "warning" as const;
  return "neutral" as const;
}

type Props = WorkspaceData & { profile: IndustryProfile };

export function WorkspaceView({ customers, leads, jobs, sales, followUps, profile }: Props) {
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const openLeads = leads.filter((lead) => !isClosedOpportunity(lead.status));
  const activeWork = jobs.filter((work) =>
    isRecentActiveWork(work.status, work.start_date),
  );
  const unpaidRevenue = sales.filter((record) =>
    isUnpaid(record.payment_status),
  );

  const openPipelineValue = openLeads.reduce(
    (sum, lead) => sum + Number(lead.estimated_value || 0),
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

  const totalRecords =
    customers.length + leads.length + jobs.length + sales.length + followUps.length;

  const criticalIssues =
    openLeads.filter((l) => !l.customer_id).length +
    activeWork.filter((w) => !w.customer_id).length +
    sales.filter((r) => r.amount === null || r.amount === undefined).length;

  const importantIssues =
    openLeads.filter((l) => l.estimated_value === null || l.estimated_value === undefined).length +
    openLeads.filter((l) => !l.next_follow_up_date || new Date(l.next_follow_up_date) <= new Date()).length +
    activeWork.filter((w) => w.job_value === null || w.job_value === undefined).length;

  const cosmeticIssues =
    customers.filter((c) => !c.phone || !c.email).length +
    customers.filter((c) => !c.address).length +
    openLeads.filter((l) => !l.source).length;

  const dataHealthScore = computeHealthScore(criticalIssues, importantIssues, cosmeticIssues, totalRecords);
  const customersWithContact = customers.filter((c) => c.name && (c.phone || c.email)).length;
  const monthlyRevenue = computeMonthlyRevenue(sales);

  const manualFollowUpItems: QueueItem[] = followUps
    .filter((action) => isOpenFollowUp(action.status))
    .map((action) => ({
      id: `manual-follow-up-${action.id}`,
      label: "Manual follow-up",
      title: action.message || "Follow up",
      detail: getFollowUpLabel(action.due_date),
      href: `/follow-ups/${action.id}/edit`,
      tone: getFollowUpTone(action.due_date),
      due_date: action.due_date,
      priority: isOverdue(action.due_date) ? 0 : isDueToday(action.due_date) ? 1 : action.due_date ? 2 : 4,
    }));

  const opportunityFollowUpItems: QueueItem[] = openLeads
    .filter((lead) => Boolean(lead.next_follow_up_date))
    .map((lead) => ({
      id: `opportunity-follow-up-${lead.id}`,
      label: `${profile.labels.leadSingular} follow-up`,
      title: lead.service_requested || "Follow up on opportunity",
      detail: getFollowUpLabel(lead.next_follow_up_date),
      href: `/leads/${lead.id}/edit`,
      tone: getFollowUpTone(lead.next_follow_up_date),
      due_date: lead.next_follow_up_date,
      priority: isOverdue(lead.next_follow_up_date) ? 0 : isDueToday(lead.next_follow_up_date) ? 1 : lead.next_follow_up_date ? 2 : 4,
    }));

  const paymentAttentionItems: QueueItem[] = unpaidRevenue.map((record) => ({
    id: `payment-${record.id}`,
    label: "Payment needed",
    title: record.service_type || formatCurrency(record.amount),
    detail: `${formatCurrency(record.amount)} marked ${record.payment_status || "unpaid"}`,
    href: `/sales/${record.id}/edit`,
    tone: "danger",
    priority: 1,
  }));

  const dataIssueCount =
    customers.filter((c) => !c.phone || !c.email).length +
    customers.filter((c) => !c.address).length +
    openLeads.filter((l) => !l.customer_id).length +
    openLeads.filter((l) => !l.source).length +
    openLeads.filter((l) => l.estimated_value === null || l.estimated_value === undefined).length +
    jobs.filter((w) => w.job_value === null || w.job_value === undefined).length;

  const cleanupItems: QueueItem[] =
    dataIssueCount > 0
      ? [
          {
            id: "data-cleanup-summary",
            label: "Data cleanup",
            title: `${dataIssueCount} records need attention`,
            detail: "Missing contact info, values, or links. Review in Data Hub.",
            href: "/data-hub",
            tone: "neutral" as const,
            priority: 5,
          },
        ]
      : [];

  const priorityQueue = [
    ...manualFollowUpItems,
    ...opportunityFollowUpItems,
    ...paymentAttentionItems,
    ...cleanupItems,
  ]
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return getSortDate(a.due_date, "") - getSortDate(b.due_date, "");
    })
    .slice(0, 8);

  const followUpSchedule = [...manualFollowUpItems, ...opportunityFollowUpItems]
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return getSortDate(a.due_date, "") - getSortDate(b.due_date, "");
    })
    .slice(0, 5);

  const opportunitiesNeedingFollowUp = openLeads.filter(
    (lead) => !lead.next_follow_up_date || isTodayOrPast(lead.next_follow_up_date),
  );

  const prioritizedOpportunities = [...openLeads]
    .sort((a, b) => {
      const aNeedsFollowUp = !a.next_follow_up_date || isTodayOrPast(a.next_follow_up_date);
      const bNeedsFollowUp = !b.next_follow_up_date || isTodayOrPast(b.next_follow_up_date);
      if (aNeedsFollowUp !== bNeedsFollowUp) return aNeedsFollowUp ? -1 : 1;
      return Number(b.estimated_value || 0) - Number(a.estimated_value || 0);
    })
    .slice(0, 5);

  const prioritizedWork = [...activeWork]
    .sort((a, b) => {
      const aUnpaid = isUnpaid(a.paid_status);
      const bUnpaid = isUnpaid(b.paid_status);
      if (aUnpaid !== bUnpaid) return aUnpaid ? -1 : 1;
      return Number(b.job_value || 0) - Number(a.job_value || 0);
    })
    .slice(0, 5);

  const recentRecords = [
    ...customers.map((customer) => ({
      id: `customer-${customer.id}`,
      type: profile.labels.customerSingular,
      title: customer.name || `Unnamed ${profile.labels.customerSingular.toLowerCase()}`,
      detail: customer.email || customer.phone || "Incomplete contact saved",
      date: customer.created_at,
      href: `/customers/${customer.id}/edit`,
    })),
    ...leads.map((lead) => ({
      id: `lead-${lead.id}`,
      type: profile.labels.leadSingular,
      title: lead.service_requested || `Untitled ${profile.labels.leadSingular.toLowerCase()}`,
      detail: lead.source || lead.status || "No source saved",
      date: lead.created_at,
      href: `/leads/${lead.id}/edit`,
    })),
    ...jobs.map((work) => ({
      id: `work-${work.id}`,
      type: profile.labels.jobSingular,
      title: work.service_type || `Untitled ${profile.labels.jobSingular.toLowerCase()}`,
      detail: work.status || "No stage saved",
      date: work.created_at,
      href: `/jobs/${work.id}/edit`,
    })),
    ...sales.map((record) => ({
      id: `revenue-${record.id}`,
      type: profile.labels.saleSingular,
      title: formatCurrency(record.amount),
      detail: record.service_type || record.payment_status || `${profile.labels.saleSingular} record`,
      date: record.created_at,
      href: `/sales/${record.id}/edit`,
    })),
    ...followUps.map((action) => ({
      id: `follow-up-${action.id}`,
      type: "Follow-up",
      title: action.message || "Follow up",
      detail: action.status || "Open",
      date: action.created_at,
      href: `/follow-ups/${action.id}/edit`,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Home"
        title={profile.headline}
        description={profile.dailyFocus}
        actions={
          <div className="flex flex-wrap gap-2">
            <RefreshButton />
            <Link
              href="/follow-ups"
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Review follow-ups
            </Link>
            <Link
              href="/imports"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Import data
            </Link>
          </div>
        }
      />

      {customers.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">Welcome to FrontierOps</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Start by adding your first customer. You can also import a CSV file if you have existing data.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="/customers"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Add your first customer
            </a>
            <a
              href="/imports"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Import from CSV
            </a>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Priority items"
          value={priorityQueue.length}
          helper="Follow-ups, payments, and cleanup"
          tone={priorityQueue.length > 0 ? "warning" : "positive"}
        />
        <StatCard
          label={profile.priorityNames.pipeline}
          value={formatCurrency(openPipelineValue)}
          helper={`${openLeads.length} open ${profile.labels.leadPlural.toLowerCase()}`}
          tone={openPipelineValue > 0 ? "positive" : "default"}
        />
        <StatCard
          label={profile.priorityNames.activeWork}
          value={activeWork.length}
          helper={`${formatCurrency(activeWorkValue)} not yet complete`}
          tone={activeWork.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label={`${profile.labels.saleSingular} needed`}
          value={formatCurrency(unpaidRevenueValue)}
          helper={`${unpaidRevenue.length} ${profile.labels.salePlural.toLowerCase()} need collection`}
          tone={unpaidRevenue.length > 0 ? "danger" : "positive"}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_220px] items-stretch">
        <SectionCard title="Revenue trend" description="Collected vs. pending — last 6 months.">
          <div className="p-5">
            <RevenueLineChart months={monthlyRevenue} />
          </div>
        </SectionCard>
        <SectionCard
          title="Data health"
          description={`${customersWithContact} of ${customers.length} ${profile.labels.customerPlural.toLowerCase()} have contact info.`}
        >
          <div className="flex flex-1 items-center justify-center p-6">
            <DataHealthRing score={dataHealthScore} />
          </div>
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr] items-start">
        <SectionCard
          title="Priority queue"
          description="What needs attention first across follow-ups, payments, and cleanup."
        >
          {priorityQueue.length === 0 ? (
            <EmptyState
              title="Nothing needs attention"
              description="No open follow-ups, unpaid revenue, or important cleanup issues were found."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {priorityQueue.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
                  <p className="mt-1.5 font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{item.detail}</p>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Follow-up schedule"
          description={`Manual follow-ups and ${profile.labels.leadSingular.toLowerCase()} follow-up dates, sorted by due date.`}
        >
          {followUpSchedule.length === 0 ? (
            <EmptyState
              title="No follow-ups scheduled"
              description={`Add a manual follow-up or set a next follow-up date on a ${profile.labels.leadSingular.toLowerCase()}.`}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {followUpSchedule.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
                  <p className="mt-1.5 font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{item.detail}</p>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
        <SectionCard
          title={`Open ${profile.labels.leadPlural.toLowerCase()}`}
          description={`${profile.labels.leadPlural} sorted by follow-up need and estimated value.`}
        >
          {prioritizedOpportunities.length === 0 ? (
            <EmptyState
              title={`No open ${profile.labels.leadPlural.toLowerCase()}`}
              description={`Create or import ${profile.labels.leadPlural.toLowerCase()} to start building the pipeline.`}
            />
          ) : (
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {opportunitiesNeedingFollowUp.length} {profile.labels.leadPlural.toLowerCase()} need follow-up
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Missing, due, or overdue follow-up dates.</p>
                </div>
                <Link
                  href="/leads"
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-300"
                >
                  Manage
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {prioritizedOpportunities.map((lead) => {
                  const customer = lead.customer_id ? customerById.get(lead.customer_id) : null;
                  return (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}/edit`}
                      className="grid gap-3 p-4 transition-colors hover:bg-slate-50 md:grid-cols-[1fr_110px_135px] md:items-center"
                    >
                      <div>
                        <p className="font-semibold text-slate-950">
                          {lead.service_requested || "Untitled opportunity"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {customer?.name || lead.source || `No ${profile.labels.customerSingular.toLowerCase()} linked`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Value</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatCurrency(lead.estimated_value)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Next step</p>
                        <div className="mt-1">
                          <StatusBadge tone={getFollowUpTone(lead.next_follow_up_date)}>
                            {lead.next_follow_up_date
                              ? getFollowUpLabel(lead.next_follow_up_date)
                              : "Add follow-up"}
                          </StatusBadge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={`Active ${profile.labels.jobPlural.toLowerCase()}`}
          description={`${profile.labels.jobPlural} that are scheduled, active, or not yet complete.`}
        >
          {prioritizedWork.length === 0 ? (
            <EmptyState
              title={`No active ${profile.labels.jobPlural.toLowerCase()}`}
              description={`Create or import ${profile.labels.jobPlural.toLowerCase()} to track delivery.`}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {prioritizedWork.map((work) => {
                const customer = work.customer_id ? customerById.get(work.customer_id) : null;
                return (
                  <Link
                    key={work.id}
                    href={`/jobs/${work.id}/edit`}
                    className="grid gap-3 p-4 transition-colors hover:bg-slate-50 md:grid-cols-[1fr_110px_auto] md:items-center"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {work.service_type || "Untitled work"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {customer?.name || `Starts ${formatDateOnly(work.start_date)}`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      {formatCurrency(work.job_value)}
                    </p>
                    <StatusBadge tone={getWorkTone(work.status)}>
                      {work.status || "Scheduled"}
                    </StatusBadge>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard
        title="Recently added"
        description="Last 4 records added across the workspace."
      >
        {recentRecords.length === 0 ? (
          <EmptyState
            title="No records yet"
            description="Import a customer list or add records manually to get started."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {recentRecords.map((record) => (
              <Link
                key={record.id}
                href={record.href}
                className="grid gap-3 px-4 py-3 transition-colors hover:bg-slate-50 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone="neutral">{record.type}</StatusBadge>
                    <p className="truncate font-semibold text-slate-950">{record.title}</p>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">{record.detail}</p>
                </div>
                <p className="hidden text-xs font-medium text-slate-400 md:block">
                  {formatTimestampDate(record.date)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
