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

type Draft = { id: string; draft_type: string; subject?: string | null; body: string; action_label?: string | null };
type Alert = { id: string; alert_type: string; severity: "info" | "warning" | "critical"; title: string; body: string };
type Props = WorkspaceData & {
  profile: IndustryProfile;
  companyName: string;
  drafts?: Draft[];
  alerts?: Alert[];
};

// The whole point of this screen: one clear answer to "what do I need to do
// today," not a dashboard of everything at once. Every item — manual
// follow-ups, opportunities due for follow-up, unpaid work, and anything the
// AI assistant surfaced — lands in ONE ranked list instead of separate,
// competing sections.
export function MobileWorkspaceView({ customers, leads, jobs, sales, followUps, profile, companyName, drafts = [], alerts = [] }: Props) {
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const openLeads = leads.filter((lead) => !isClosedOpportunity(lead.status));
  const activeWork = jobs.filter((work) => isRecentActiveWork(work.status, work.start_date));
  const unpaidRevenue = sales.filter((record) => isUnpaid(record.payment_status));

  const manualFollowUpItems: QueueItem[] = followUps
    .filter((action) => isOpenFollowUp(action.status))
    .map((action) => ({
      id: `manual-follow-up-${action.id}`,
      label: "Follow-up",
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
      label: profile.labels.leadSingular,
      title: lead.service_requested || `Follow up on ${profile.labels.leadSingular.toLowerCase()}`,
      detail: getFollowUpLabel(lead.next_follow_up_date),
      href: `/leads/${lead.id}/edit`,
      tone: getFollowUpTone(lead.next_follow_up_date),
      due_date: lead.next_follow_up_date,
      priority: isOverdue(lead.next_follow_up_date) ? 0 : isDueToday(lead.next_follow_up_date) ? 1 : lead.next_follow_up_date ? 2 : 4,
    }));

  const paymentAttentionItems: QueueItem[] = unpaidRevenue.map((record) => ({
    id: `payment-${record.id}`,
    label: "Unpaid",
    title: record.service_type || formatCurrency(record.amount),
    detail: `${formatCurrency(record.amount)} — ${record.payment_status || "unpaid"}`,
    href: `/sales/${record.id}/edit`,
    tone: "danger" as const,
    priority: 1,
  }));

  // AI-suggested items fold into the same list instead of their own banner —
  // one place to look, not a second mechanism competing for attention.
  const aiItems: QueueItem[] = [
    ...drafts.map((d) => ({
      id: `draft-${d.id}`,
      label: "Suggested",
      title: d.subject || d.body.slice(0, 60),
      detail: d.action_label || "Review draft",
      href: `/aria?item=draft-${d.id}`,
      tone: "neutral" as const,
      priority: 2,
    })),
    ...alerts.map((a) => {
      const tone: "success" | "warning" | "danger" | "neutral" =
        a.severity === "critical" ? "danger" : a.severity === "warning" ? "warning" : "neutral";
      return {
        id: `alert-${a.id}`,
        label: "Alert",
        title: a.title,
        detail: a.body,
        href: `/aria?item=alert-${a.id}`,
        tone,
        priority: a.severity === "critical" ? 0 : 2,
      };
    }),
  ];

  const priorityQueue = [
    ...manualFollowUpItems,
    ...opportunityFollowUpItems,
    ...paymentAttentionItems,
    ...aiItems,
  ].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return getSortDate(a.due_date, "") - getSortDate(b.due_date, "");
  });

  const visibleQueue = priorityQueue.slice(0, 8);
  const overdueCount = priorityQueue.filter((i) => i.tone === "danger").length;
  // /follow-ups only ever shows follow-up-sourced items (manual + opportunity),
  // never the unpaid-payment or AI items also in this list — so the "See all"
  // count must reflect just that subset, or the number wouldn't match what's
  // actually there when you tap through.
  const followUpSourcedCount = manualFollowUpItems.length + opportunityFollowUpItems.length;

  const jobPlural = profile.labels.jobPlural;
  const dayLabel = getDayLabel();
  const greeting = getGreeting();
  const visitsToShow = activeWork.slice(0, 3);

  // One plain-language sentence instead of a grid of stat tiles.
  const statusLine =
    priorityQueue.length === 0
      ? "Nothing needs your attention right now."
      : overdueCount > 0
        ? `${overdueCount} ${overdueCount === 1 ? "thing needs" : "things need"} attention now.`
        : `${priorityQueue.length} ${priorityQueue.length === 1 ? "thing" : "things"} to look at today.`;

  return (
    <div className="block md:hidden pb-8">
      {/* Greeting + one-line status */}
      <div className="px-5 pt-6 pb-6">
        <p className="text-[13px] font-medium text-ud-muted mb-1.5">{dayLabel}</p>
        <p className="text-[24px] font-semibold leading-[1.2] tracking-[-0.01em] text-ud-ink mb-2">
          {greeting}, {companyName}.
        </p>
        <p className={cn("text-[15px]", overdueCount > 0 ? "text-ud-danger font-medium" : "text-ud-muted")}>
          {statusLine}
        </p>
      </div>

      {/* Needs attention — the one list */}
      <div className="px-4 pb-6">
        {visibleQueue.length > 0 ? (
          <>
            <div className="flex items-center justify-between px-1 mb-2.5">
              <p className="text-[13px] font-semibold text-ud-muted uppercase tracking-[0.06em]">
                Needs your attention
              </p>
              {followUpSourcedCount > 0 && (
                <Link href="/follow-ups" className="text-[13px] font-semibold text-ud-accent">
                  See all {followUpSourcedCount} follow-ups
                </Link>
              )}
            </div>
            <Card padding={0} radius="md" className="overflow-hidden">
              {visibleQueue.map((item) => {
                const pillTone: "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "ink" =
                  item.tone === "danger" ? "danger" : item.tone === "warning" ? "warning" : "neutral";
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-[16px] border-b border-ud-soft last:border-0 active:bg-ud-surface-soft"
                  >
                    <Pill tone={pillTone} className="shrink-0">{item.label}</Pill>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-ud-ink truncate">{item.title}</p>
                      <p className="text-[13px] text-ud-muted truncate mt-0.5">{item.detail}</p>
                    </div>
                    <svg className="shrink-0 text-ud-faint" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                );
              })}
            </Card>
          </>
        ) : (
          <div className="rounded-[14px] border border-ud-soft bg-ud-surface-soft px-5 py-9 text-center">
            <p className="text-[15px] font-medium text-ud-ink">You&apos;re all caught up.</p>
            <p className="text-[13px] text-ud-muted mt-1">Nothing needs attention today.</p>
          </div>
        )}
      </div>

      {/* Today's jobs — only shown when there's something to show */}
      {visitsToShow.length > 0 && (
        <div className="px-4 pb-6">
          <div className="flex items-center justify-between px-1 mb-2.5">
            <p className="text-[13px] font-semibold text-ud-muted uppercase tracking-[0.06em]">
              Today&apos;s {jobPlural.toLowerCase()}
            </p>
            <Link href="/jobs" className="text-[13px] font-semibold text-ud-accent">
              See all
            </Link>
          </div>
          <Card padding={0} radius="md" className="overflow-hidden">
            {visitsToShow.map((job) => {
              const customer =
                (job.contact_id ? customerById.get(job.contact_id) : null) ??
                (job.customer_id ? customerById.get(job.customer_id) : null);
              const tone = getWorkTone(job.status);
              const pillTone: "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "ink" =
                tone === "success" ? "success" : tone === "warning" ? "warning" : tone === "danger" ? "danger" : "neutral";
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}/edit`}
                  className="flex items-center gap-3 px-4 py-[16px] border-b border-ud-soft last:border-0 active:bg-ud-surface-soft"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-ud-ink truncate">
                      {job.service_type || `Untitled ${profile.labels.jobSingular.toLowerCase()}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Pill tone={pillTone}>{job.status || "Active"}</Pill>
                      <p className="text-[13px] text-ud-muted truncate">
                        {customer?.name || `No ${profile.labels.customerSingular.toLowerCase()} linked`}
                      </p>
                    </div>
                  </div>
                  {job.job_value != null && (
                    <span className="udv2-num text-[14px] font-semibold text-ud-ink shrink-0">
                      {formatCurrency(job.job_value)}
                    </span>
                  )}
                </Link>
              );
            })}
          </Card>
        </div>
      )}
    </div>
  );
}
