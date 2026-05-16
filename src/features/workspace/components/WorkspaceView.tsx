"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatStrip } from "@/components/ui/StatStrip";
import { Pill } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import { AiBriefCard } from "@/features/workspace/AiBriefCard";
import { RevenueChartCard } from "@/features/workspace/RevenueChartCard";
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

function getDayLabel() {
  const now = new Date();
  return now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
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
    tone: "danger" as const,
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
  const dayLabel = getDayLabel();
  const firstName = profile.headline.split(" ")[0];

  const visitsToShow = activeWork.slice(0, 5);

  return (
    <div className="hidden md:block space-y-6">
      <PageHeader
        eyebrow={`${dayLabel} · Operating brief`}
        title={
          <>Good morning, <em className="font-serif italic text-ud-accent">{firstName}</em>.</>
        }
        description={profile.dailyFocus}
      />

      <StatStrip
        items={[
          {
            label: "Unpaid revenue",
            value: formatCurrency(unpaidRevenueValue),
            helper: unpaidRevenueValue > 0 ? `${unpaidRevenue.length} outstanding` : "All clear",
            tone: unpaidRevenueValue > 0 ? "danger" : "default",
          },
          {
            label: `Open ${leadPlural}`,
            value: openLeads.length,
            helper: formatCurrency(openPipelineValue),
            tone: "default",
          },
          {
            label: `Active ${jobPlural}`,
            value: activeWork.length,
            helper: formatCurrency(activeWorkValue),
            tone: "default",
          },
          {
            label: "Follow-ups due",
            value: followUpSchedule.length,
            helper: "Manual + opportunity",
            tone: followUpSchedule.length > 0 ? "warning" : "default",
          },
        ]}
      />

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-[24px] items-start">
        {/* Left column */}
        <div className="space-y-5">
          <AiBriefCard
            eyebrow="UnifData · Suggested action"
            body={profile.headline}
            actions={[
              { label: "Review follow-ups", href: "/follow-ups", variant: "primary" },
              { label: "Ask follow-up", href: "/ai-assistant", variant: "secondary" },
              { label: "Snooze", href: "#", variant: "ghost" },
            ]}
          />

          {/* Today's visits card */}
          <Card padding={0} radius="md" className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ud-soft">
              <p className="text-[13px] font-semibold text-ud-ink">
                Today&apos;s {jobPlural.toLowerCase()}
              </p>
              <Link
                href="/jobs"
                className="text-[12px] font-semibold text-ud-accent hover:opacity-80"
              >
                See all →
              </Link>
            </div>
            {visitsToShow.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-ud-faint">
                No active {jobPlural.toLowerCase()} right now.
              </p>
            ) : (
              <div>
                {visitsToShow.map((job) => {
                  const customer = job.customer_id ? customerById.get(job.customer_id) : null;
                  const tone = getWorkTone(job.status);
                  const pillTone: "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "ink" =
                    tone === "success" ? "success" :
                    tone === "warning" ? "warning" :
                    tone === "danger" ? "danger" :
                    "neutral";
                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}/edit`}
                      className="flex items-start gap-3 px-5 py-3 border-b border-ud-soft last:border-0 hover:bg-ud-surface-soft transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-semibold text-ud-ink truncate">
                            {job.service_type || `Untitled ${profile.labels.jobSingular.toLowerCase()}`}
                          </p>
                          <Pill tone={pillTone}>{job.status || "Active"}</Pill>
                        </div>
                        <p className="text-[12px] text-ud-muted mt-0.5">
                          {customer?.name || "No customer linked"}
                        </p>
                      </div>
                      {job.job_value != null && (
                        <span className="udv2-num text-[12.5px] font-semibold text-ud-ink shrink-0">
                          {formatCurrency(job.job_value)}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <RevenueChartCard sales={sales} />
        </div>

        {/* Right column — sticky */}
        <div className="sticky top-[80px] space-y-5">
          {/* Needs attention card */}
          <Card padding={0} radius="md" className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ud-soft">
              <p className="text-[13px] font-semibold text-ud-ink">Needs attention</p>
              {priorityQueue.length > 0 && (
                <span className="text-[11px] font-semibold text-ud-muted">
                  {priorityQueue.length} item{priorityQueue.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {priorityQueue.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-ud-faint">
                Nothing needs attention right now.
              </p>
            ) : (
              <div>
                {priorityQueue.map((item) => {
                  const pillTone: "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "ink" =
                    item.tone === "danger" ? "danger" :
                    item.tone === "warning" ? "warning" :
                    item.tone === "success" ? "success" :
                    "neutral";
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex items-start gap-3 px-5 py-3 border-b border-ud-soft last:border-0 hover:bg-ud-surface-soft transition-colors"
                    >
                      <Pill tone={pillTone} className="shrink-0 mt-0.5">{item.label}</Pill>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-ud-ink truncate">{item.title}</p>
                        <p className="text-[11.5px] text-ud-muted mt-0.5">{item.detail}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recent activity card */}
          <Card padding={0} radius="md" className="overflow-hidden">
            <div className="px-5 py-4 border-b border-ud-soft">
              <p className="text-[13px] font-semibold text-ud-ink">Recent activity</p>
            </div>
            {recentRecords.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-ud-faint">
                No recent records.
              </p>
            ) : (
              <div className="px-5 py-4 space-y-4">
                {recentRecords.map((record, i) => (
                  <Link
                    key={record.id}
                    href={record.href}
                    className="flex items-start gap-3 group"
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-ud-accent mt-1.5" />
                      {i < recentRecords.length - 1 && (
                        <div className="w-px flex-1 bg-ud-surface-sunk mt-1 min-h-[20px]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <p className="text-[10.5px] text-ud-faint uppercase tracking-[0.08em] mb-0.5">
                        {record.type} · {formatTimestampDate(record.date)}
                      </p>
                      <p className="text-[13px] font-semibold text-ud-ink truncate group-hover:text-ud-accent transition-colors">
                        {record.title}
                      </p>
                      <p className="text-[12px] text-ud-muted truncate">{record.detail}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
