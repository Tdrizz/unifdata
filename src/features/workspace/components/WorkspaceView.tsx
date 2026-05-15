import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { RefreshButton } from "@/app/workspace/RefreshButton";
import { RevenueLineChart, computeMonthlyRevenue } from "@/app/workspace/RevenueChart";
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

  const leadPlural = profile.labels.leadPlural;
  const jobPlural = profile.labels.jobPlural;

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
              className="rounded-2xl bg-[#1D2D3E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57]"
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
          <p className="text-lg font-black text-slate-950">Welcome to UnifData</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Start by adding your first customer. You can also import a CSV file if you have existing data.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="/customers"
              className="rounded-2xl bg-[#1D2D3E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57]"
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

      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={`Open ${leadPlural}`}
          value={openLeads.length}
          helper={formatCurrency(openPipelineValue)}
          tone={openLeads.length > 0 ? "positive" : "default"}
        />
        <StatCard
          label={`${jobPlural} active`}
          value={activeWork.length}
          helper={`${formatCurrency(activeWorkValue)} in progress`}
          tone={activeWork.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Unpaid revenue"
          value={formatCurrency(unpaidRevenueValue)}
          helper={`${unpaidRevenue.length} ${profile.labels.salePlural.toLowerCase()} outstanding`}
          tone={unpaidRevenueValue > 0 ? "danger" : "positive"}
        />
        <StatCard
          label="Follow-ups due"
          value={followUpSchedule.length}
          helper="Manual and opportunity follow-ups"
          tone={followUpSchedule.length > 0 ? "warning" : "positive"}
        />
      </section>

      {/* Mobile brief chips — md:hidden */}
      <div className="flex flex-wrap gap-2 md:hidden">
        {unpaidRevenueValue > 0 && (
          <Link
            href="/sales"
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"
          >
            Unpaid {formatCurrency(unpaidRevenueValue)}
          </Link>
        )}
        {openLeads.length > 0 && (
          <Link
            href="/leads"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            {openLeads.length} open {leadPlural.toLowerCase()}
          </Link>
        )}
        {followUpSchedule.length > 0 && (
          <Link
            href="/follow-ups"
            className="rounded-full border border-[#7A8C2A]/30 bg-[rgba(122,140,42,0.08)] px-3 py-1.5 text-xs font-semibold text-[#7A8C2A]"
          >
            {followUpSchedule.length} follow-ups due
          </Link>
        )}
        {activeWork.length > 0 && (
          <Link
            href="/jobs"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
          >
            {activeWork.length} active {jobPlural.toLowerCase()}
          </Link>
        )}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr] items-start">
        {/* Left column */}
        <div className="space-y-5 xl:order-first">
          {/* Revenue chart */}
          <SectionCard title="Revenue trend" description="Collected vs. pending — last 6 months.">
            <div className="p-5">
              <RevenueLineChart months={monthlyRevenue} />
            </div>
          </SectionCard>

          {/* Action queue */}
          <SectionCard
            title="Action queue"
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
                    className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-[68px] shrink-0">
                      <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-5 order-first xl:order-last">
          {/* AI Brief hero card */}
          <div
            className="relative overflow-hidden rounded-[22px] p-[22px] text-white"
            style={{ background: "linear-gradient(160deg, #1D2D3E 0%, #2b3d52 100%)" }}
          >
            {/* olive radial glow decoration */}
            <div
              className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, #7A8C2A 0%, transparent 70%)" }}
            />
            {/* header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7A8C2A]">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">UnifData AI</p>
            </div>
            <p className="text-[17px] font-semibold leading-snug">{profile.headline}</p>
            <p className="mt-2 text-[13px] leading-6 text-white/70">{profile.dailyFocus}</p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/follow-ups"
                className="flex-1 rounded-xl bg-white/14 px-3 py-2.5 text-center text-xs font-semibold"
              >
                Review follow-ups
              </Link>
              <Link
                href="/ai-assistant"
                className="flex-1 rounded-xl bg-white/14 px-3 py-2.5 text-center text-xs font-semibold"
              >
                Open chat
              </Link>
            </div>
          </div>

          {/* Follow-ups SectionCard */}
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
                    className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="h-5 w-5 rounded-full border-2 border-slate-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      <p
                        className={`text-xs mt-0.5 ${
                          item.tone === "danger"
                            ? "text-red-500"
                            : item.tone === "warning"
                            ? "text-amber-500"
                            : "text-slate-500"
                        }`}
                      >
                        {item.detail}
                      </p>
                    </div>
                    <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Recent records SectionCard */}
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
      </div>
    </div>
  );
}
