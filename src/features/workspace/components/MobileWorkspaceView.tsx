"use client";

import Link from "next/link";
import { Sparkline } from "@/components/ui/Sparkline";
import { Pill } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import { AiBriefCard } from "@/features/workspace/AiBriefCard";
import {
  formatDateOnly,
  parseDateOnly,
  isTodayOrPast,
  isOverdue,
  isDueToday,
} from "@/lib/date-format";
import { formatCurrency, cn } from "@/lib/utils";
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

export function MobileWorkspaceView({ customers, leads, jobs, sales, followUps, profile }: Props) {
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
    .slice(0, 5);

  const followUpSchedule = [...manualFollowUpItems, ...opportunityFollowUpItems]
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return getSortDate(a.due_date, "") - getSortDate(b.due_date, "");
    })
    .slice(0, 5);

  // Sparkline: last 8 sales amounts
  const sparklineData = sales.slice(0, 8).map((s) => Number(s.amount || 0)).reverse();

  // Recent unpaid delta: sum of unpaid in last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentUnpaidDelta = unpaidRevenue
    .filter((r) => r.sale_date && new Date(r.sale_date).getTime() >= sevenDaysAgo)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const leadPlural = profile.labels.leadPlural;
  const jobPlural = profile.labels.jobPlural;
  const dayLabel = getDayLabel();
  const firstName = profile.headline.split(" ")[0];

  const visitsToShow = activeWork.slice(0, 3);

  // Count overdue follow-ups
  const overdueFollowUps = followUpSchedule.filter((f) => f.tone === "danger").length;

  return (
    <div className="block md:hidden space-y-5 pb-8">
      {/* 1. Greeting block */}
      <div className="px-[18px] pt-[4px] pb-[18px]">
        <p className="text-[10.5px] font-semibold uppercase tracking-eyebrow text-ud-muted mb-1.5">
          {dayLabel} · Operating brief
        </p>
        <p className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-ud-ink">
          Good morning, {firstName}.
        </p>
        {profile.dailyFocus && (
          <p className="text-[14px] leading-[1.55] text-ud-muted mt-2">
            {profile.dailyFocus}
          </p>
        )}
      </div>

      {/* 2. AiBriefCard */}
      <div className="px-[14px]">
        <AiBriefCard
          eyebrow="UnifData · Daily focus"
          body={profile.headline}
          actions={[
            { label: "Review follow-ups", href: "/follow-ups", variant: "accent" },
            { label: "Ask AI", href: "/ai-assistant", variant: "secondary" },
          ]}
        />
      </div>

      {/* 3. Hero KPI card — unpaid revenue */}
      <div className="mx-[14px] bg-ud-surface border border-ud rounded-[12px] shadow-ud p-[14px_16px] flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-ud-muted">Unpaid revenue</p>
          <p className="udv2-num text-[34px] font-semibold tracking-[-0.02em] text-ud-ink mt-0.5">
            {formatCurrency(unpaidRevenueValue)}
          </p>
          {recentUnpaidDelta > 0 && (
            <p className="text-[12.5px] text-ud-danger mt-0.5">
              +{formatCurrency(recentUnpaidDelta)} this wk
            </p>
          )}
          <p className="text-[11.5px] text-ud-faint mt-0.5">
            {unpaidRevenue.length} invoice{unpaidRevenue.length !== 1 ? "s" : ""}
          </p>
        </div>
        {sparklineData.length >= 2 && (
          <div className="shrink-0 mt-1">
            <Sparkline data={sparklineData} width={88} height={42} color="var(--ud-accent)" fill />
          </div>
        )}
      </div>

      {/* 4. Secondary KPI scroll strip */}
      <div className="flex gap-[10px] overflow-x-auto px-[14px] no-scrollbar py-1">
        {/* Open leads */}
        <div className="min-w-[140px] flex-shrink-0 bg-ud-surface border border-ud rounded-[12px] p-[12px_14px]">
          <p className="text-[11px] font-medium text-ud-muted">Open {leadPlural.toLowerCase()}</p>
          <p className="udv2-num text-[22px] font-semibold tracking-[-0.02em] text-ud-ink mt-0.5">
            {openLeads.length}
          </p>
          <p className="text-[11px] text-ud-faint mt-0.5">{formatCurrency(openPipelineValue)}</p>
        </div>

        {/* Active jobs */}
        <div className="min-w-[140px] flex-shrink-0 bg-ud-surface border border-ud rounded-[12px] p-[12px_14px]">
          <p className="text-[11px] font-medium text-ud-muted">Active {jobPlural.toLowerCase()}</p>
          <p className="udv2-num text-[22px] font-semibold tracking-[-0.02em] text-ud-ink mt-0.5">
            {activeWork.length}
          </p>
          <p className="text-[11px] text-ud-faint mt-0.5">Next visit soon</p>
        </div>

        {/* Follow-ups */}
        <div className="min-w-[140px] flex-shrink-0 bg-ud-surface border border-ud rounded-[12px] p-[12px_14px]">
          <p className="text-[11px] font-medium text-ud-muted">Follow-ups</p>
          <p
            className={cn(
              "udv2-num text-[22px] font-semibold tracking-[-0.02em] mt-0.5",
              followUpSchedule.length > 0 ? "text-ud-warning" : "text-ud-ink",
            )}
          >
            {followUpSchedule.length}
          </p>
          <p className={cn("text-[11px] mt-0.5", overdueFollowUps > 0 ? "text-ud-danger" : "text-ud-faint")}>
            {overdueFollowUps > 0 ? `${overdueFollowUps} overdue` : "All on track"}
          </p>
        </div>
      </div>

      {/* 5. Today's visits card */}
      <div className="mx-[14px]">
        <Card padding={0} radius="md" className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ud-soft">
            <p className="text-[13px] font-semibold text-ud-ink">
              Today&apos;s {jobPlural.toLowerCase()}
            </p>
            <Link
              href="/jobs"
              className="text-[12.5px] font-semibold text-ud-accent hover:opacity-80"
            >
              See all →
            </Link>
          </div>
          {visitsToShow.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-ud-faint">
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
                    className="flex items-start gap-3 px-4 py-3 border-b border-ud-soft last:border-0 hover:bg-ud-surface-soft transition-colors"
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
      </div>

      {/* 6. Needs attention card */}
      <div className="mx-[14px]">
        <Card padding={0} radius="md" className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ud-soft">
            <p className="text-[13px] font-semibold text-ud-ink">Needs attention</p>
            {priorityQueue.length > 0 && (
              <Link
                href="/follow-ups"
                className="text-[12.5px] font-semibold text-ud-accent hover:opacity-80"
              >
                All {priorityQueue.length} →
              </Link>
            )}
          </div>
          {priorityQueue.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-ud-faint">
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
                    className="flex items-start gap-3 px-4 py-3 border-b border-ud-soft last:border-0 hover:bg-ud-surface-soft transition-colors"
                  >
                    {/* Checkbox circle */}
                    <div className="h-5 w-5 rounded-[6px] border border-ud-hard shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-ud-ink truncate">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Pill tone={pillTone}>{item.label}</Pill>
                        {item.tone === "danger" && (
                          <span className="text-[11px] text-ud-danger">Overdue</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
