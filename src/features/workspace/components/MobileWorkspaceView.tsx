"use client";

import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import {
  formatDateOnly,
  parseDateOnly,
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type Props = WorkspaceData & { profile: IndustryProfile; companyName: string };

export function MobileWorkspaceView({ customers, leads, jobs, sales, followUps, profile, companyName }: Props) {
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
      title: lead.service_requested || `Follow up on ${profile.labels.leadSingular.toLowerCase()}`,
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
            title: `${dataIssueCount} data issues to fix`,
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

  const leadPlural = profile.labels.leadPlural;
  const jobPlural = profile.labels.jobPlural;
  const dayLabel = getDayLabel();
  const greeting = getGreeting();
  const totalQueueCount = manualFollowUpItems.length + opportunityFollowUpItems.length + paymentAttentionItems.length + cleanupItems.length;
  const visitsToShow = activeWork.slice(0, 3);

  // Count overdue follow-ups
  const overdueFollowUps = followUpSchedule.filter((f) => f.tone === "danger").length;

  return (
    <div className="block md:hidden pb-8">
      {/* 1. Greeting */}
      <div className="px-4 pt-6 pb-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ud-muted mb-1">
          {dayLabel}
        </p>
        <p className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-ud-ink">
          {greeting}, {companyName}.
        </p>
      </div>

      {/* 2. Quick actions */}
      <div className="overflow-x-auto no-scrollbar px-4 pb-5">
        <div className="flex gap-[8px]">
          <Link
            href="/customers#customer-quick-add"
            className="flex-shrink-0 flex items-center gap-[6px] rounded-full border border-ud bg-ud-surface px-[16px] py-[10px] text-[13px] font-semibold text-ud-ink active:scale-[0.96] transition-transform"
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {profile.labels.customerSingular}
          </Link>
          <Link
            href="/leads#leads-quick-add"
            className="flex-shrink-0 flex items-center gap-[6px] rounded-full border border-ud bg-ud-surface px-[16px] py-[10px] text-[13px] font-semibold text-ud-ink active:scale-[0.96] transition-transform"
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {profile.labels.leadSingular}
          </Link>
          <Link
            href="/jobs#job-quick-add"
            className="flex-shrink-0 flex items-center gap-[6px] rounded-full border border-ud bg-ud-surface px-[16px] py-[10px] text-[13px] font-semibold text-ud-ink active:scale-[0.96] transition-transform"
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {profile.labels.jobSingular}
          </Link>
          <Link
            href="/follow-ups#followup-quick-add"
            className="flex-shrink-0 flex items-center gap-[6px] rounded-full border border-ud bg-ud-surface px-[16px] py-[10px] text-[13px] font-semibold text-ud-ink active:scale-[0.96] transition-transform"
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Follow-up
          </Link>
        </div>
      </div>

      {/* 3. 2×2 stat grid */}
      <div className="px-4 grid grid-cols-2 gap-3 pb-5">
        <div className="bg-ud-surface border border-ud rounded-[12px] p-[14px_16px]">
          <p className="text-[12px] font-medium text-ud-muted">Open {leadPlural.toLowerCase()}</p>
          <p className="udv2-num text-[24px] font-semibold tracking-[-0.02em] text-ud-ink mt-0.5">
            {openLeads.length}
          </p>
          <p className="text-[12px] text-ud-faint mt-0.5">{formatCurrency(openPipelineValue)}</p>
        </div>

        <div className="bg-ud-surface border border-ud rounded-[12px] p-[14px_16px]">
          <p className="text-[12px] font-medium text-ud-muted">Active {jobPlural.toLowerCase()}</p>
          <p className="udv2-num text-[24px] font-semibold tracking-[-0.02em] text-ud-ink mt-0.5">
            {activeWork.length}
          </p>
          <p className="text-[12px] text-ud-faint mt-0.5">{formatCurrency(activeWorkValue)}</p>
        </div>

        <div className="bg-ud-surface border border-ud rounded-[12px] p-[14px_16px]">
          <p className="text-[12px] font-medium text-ud-muted">Unpaid revenue</p>
          <p className={cn(
            "udv2-num text-[24px] font-semibold tracking-[-0.02em] mt-0.5",
            unpaidRevenueValue > 0 ? "text-ud-danger" : "text-ud-ink",
          )}>
            {formatCurrency(unpaidRevenueValue)}
          </p>
          <p className="text-[12px] text-ud-faint mt-0.5">
            {unpaidRevenue.length > 0 ? `${unpaidRevenue.length} outstanding` : "All clear"}
          </p>
        </div>

        <div className="bg-ud-surface border border-ud rounded-[12px] p-[14px_16px]">
          <p className="text-[12px] font-medium text-ud-muted">Follow-ups due</p>
          <p className={cn(
            "udv2-num text-[24px] font-semibold tracking-[-0.02em] mt-0.5",
            followUpSchedule.length > 0 ? "text-ud-warning" : "text-ud-ink",
          )}>
            {followUpSchedule.length}
          </p>
          <p className={cn("text-[12px] mt-0.5", overdueFollowUps > 0 ? "text-ud-danger" : "text-ud-faint")}>
            {overdueFollowUps > 0 ? `${overdueFollowUps} overdue` : "On track"}
          </p>
        </div>
      </div>

      {/* 4. Needs attention */}
      {priorityQueue.length > 0 && (
        <div className="px-4 pb-5">
          <Card padding={0} radius="md" className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-[14px] border-b border-ud-soft">
              <p className="text-[13px] font-semibold text-ud-ink">Needs attention</p>
              <Link href="/follow-ups" className="text-[12px] font-semibold text-ud-accent">
                {totalQueueCount > priorityQueue.length ? `All ${totalQueueCount} →` : "View all →"}
              </Link>
            </div>
            {priorityQueue.map((item) => {
              const pillTone: "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "ink" =
                item.tone === "danger" ? "danger" :
                item.tone === "warning" ? "warning" :
                "neutral";
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-[14px] border-b border-ud-soft last:border-0 active:bg-ud-surface-soft"
                >
                  <Pill tone={pillTone} className="shrink-0">{item.label}</Pill>
                  <p className="text-[13px] font-semibold text-ud-ink truncate flex-1">{item.title}</p>
                  <svg className="shrink-0 text-ud-faint" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              );
            })}
          </Card>
        </div>
      )}

      {/* 5. Today's visits */}
      <div className="px-[14px] pb-[14px]">
        <Card padding={0} radius="md" className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ud-soft">
            <p className="text-[13px] font-semibold text-ud-ink">
              Today&apos;s {jobPlural.toLowerCase()}
            </p>
            <Link href="/jobs" className="text-[12px] font-semibold text-ud-accent">
              See all →
            </Link>
          </div>
          {visitsToShow.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-ud-faint">
              No active {jobPlural.toLowerCase()} right now.
            </p>
          ) : (
            visitsToShow.map((job) => {
              const customer = job.customer_id ? customerById.get(job.customer_id) : null;
              const tone = getWorkTone(job.status);
              const pillTone: "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "ink" =
                tone === "success" ? "success" : tone === "warning" ? "warning" : tone === "danger" ? "danger" : "neutral";
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}/edit`}
                  className="flex items-center gap-3 px-4 py-[14px] border-b border-ud-soft last:border-0 active:bg-ud-surface-soft"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ud-ink truncate">
                      {job.service_type || `Untitled ${profile.labels.jobSingular.toLowerCase()}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Pill tone={pillTone}>{job.status || "Active"}</Pill>
                      <p className="text-[11.5px] text-ud-muted truncate">
                        {customer?.name || `No ${profile.labels.customerSingular.toLowerCase()} linked`}
                      </p>
                    </div>
                  </div>
                  {job.job_value != null && (
                    <span className="udv2-num text-[13px] font-semibold text-ud-ink shrink-0">
                      {formatCurrency(job.job_value)}
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}
