"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { AiBriefCard } from "@/features/workspace/AiBriefCard";
import {
  formatDateOnly,
  parseDateOnly,
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

type Props = WorkspaceData & { profile: IndustryProfile; companyName: string };

export function WorkspaceView({ customers, leads, jobs, sales, followUps, profile, companyName }: Props) {
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
  const unpaidRevenueValue = unpaidRevenue.reduce(
    (sum, record) => sum + Number(record.amount || 0),
    0,
  );

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const revenueMTD = sales
    .filter((s) => new Date(s.created_at) >= startOfMonth)
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);

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

  const leadPlural = profile.labels.leadPlural;
  const jobPlural = profile.labels.jobPlural;
  const dayLabel = getDayLabel();

  const visitsToShow = activeWork.slice(0, 5);

  return (
    <div className="hidden md:block space-y-6 px-6 pt-5 pb-8">
      <PageHeader
        eyebrow={`${dayLabel} · Operating brief`}
        title={<>Good morning, {companyName}.</>}
        description={profile.dailyFocus}
        actions={
          <div className="flex gap-2">
            <Link href="/jobs" className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-2 text-[13px] font-semibold text-ud-muted hover:bg-ud-surface-sunk">View calendar</Link>
            <Link href="/customers" className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#4A3FA8] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90">
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Quick add
            </Link>
          </div>
        }
      />

      <AiBriefCard
        eyebrow="UnifData · Daily focus"
        body={profile.headline}
        bullets={priorityQueue.slice(0, 3).map((item) =>
          item.detail ? `${item.title} — ${item.detail}` : item.title
        )}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Follow-ups due" value={followUpSchedule.length} helper={followUpSchedule.length > 0 ? `${followUpSchedule.filter(i => i.priority === 0).length} overdue · ${followUpSchedule.filter(i => i.priority === 1).length} due today` : "All clear"} tone={followUpSchedule.length > 0 ? "warning" : "default"} />
        <StatCard label={`${jobPlural} today`} value={activeWork.length} helper={activeWork.length > 0 ? `${activeWork.length} active` : "None scheduled"} tone="default" />
        <StatCard label="Revenue MTD" value={formatCurrency(revenueMTD)} helper={revenueMTD > 0 ? `This month` : "No revenue yet"} tone={revenueMTD > 0 ? "positive" : "default"} />
        <StatCard label={`Open ${leadPlural}`} value={openLeads.length} helper={formatCurrency(openPipelineValue)} tone="default" />
        <StatCard label="Unpaid invoices" value={formatCurrency(unpaidRevenueValue)} helper={unpaidRevenue.length > 0 ? `${unpaidRevenue.length} outstanding` : "All clear"} tone={unpaidRevenueValue > 0 ? "danger" : "default"} />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-5 items-start">
        {/* Left column — Priority queue */}
        <Card padding={0} radius="md" className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-[15px] border-b border-[rgba(0,0,0,0.045)]">
            <div>
              <p className="text-[13.5px] font-semibold text-ud-ink">Priority queue</p>
              <p className="text-[12px] text-ud-muted mt-0.5">Overdue and due-today items</p>
            </div>
            <Link href="/follow-ups" className="inline-flex items-center rounded-[7px] border border-ud bg-ud-surface px-[11px] py-[5px] text-[12px] font-semibold text-ud-muted hover:bg-ud-surface-sunk">View all</Link>
          </div>
          {priorityQueue.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-ud-faint">Nothing needs attention right now.</p>
          ) : (
            <div>
              {priorityQueue.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-[14px] px-5 py-[13px] border-b border-[rgba(0,0,0,0.04)] last:border-0 hover:bg-[rgba(0,0,0,0.012)] transition-colors"
                >
                  <div className={`h-2 w-2 shrink-0 rounded-full ${
                    item.tone === "danger" ? "bg-[#e05050]" :
                    item.tone === "warning" ? "bg-[#d97706]" :
                    item.tone === "success" ? "bg-[#2a8c3c]" : "bg-[#c5bfb5]"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-ud-ink truncate">{item.title}</p>
                    <p className="text-[12px] text-ud-muted mt-0.5">{item.detail}</p>
                  </div>
                  <span className={`text-[12px] font-semibold shrink-0 ${
                    item.tone === "danger" ? "text-ud-danger" :
                    item.tone === "warning" ? "text-ud-warning" : "text-ud-muted"
                  }`}>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Today's jobs */}
          <Card padding={0} radius="md" className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-[15px] border-b border-[rgba(0,0,0,0.045)]">
              <p className="text-[13.5px] font-semibold text-ud-ink">Today&apos;s {jobPlural.toLowerCase()}</p>
              <Link href="/jobs" className="inline-flex items-center rounded-[7px] border border-ud bg-ud-surface px-[11px] py-[5px] text-[12px] font-semibold text-ud-muted hover:bg-ud-surface-sunk">Calendar</Link>
            </div>
            {visitsToShow.length === 0 ? (
              <p className="px-5 py-6 text-center text-[13px] text-ud-faint">No active {jobPlural.toLowerCase()} right now.</p>
            ) : (
              <div>
                {visitsToShow.map((job) => {
                  const customer = job.customer_id ? customerById.get(job.customer_id) : null;
                  const tone = getWorkTone(job.status);
                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}/edit`}
                      className="flex items-center gap-[14px] px-5 py-[13px] border-b border-[rgba(0,0,0,0.04)] last:border-0 hover:bg-[rgba(0,0,0,0.012)] transition-colors"
                    >
                      <div className={`h-2 w-2 shrink-0 rounded-full ${
                        tone === "danger" ? "bg-[#e05050]" :
                        tone === "warning" ? "bg-[#d97706]" :
                        tone === "success" ? "bg-[#2a8c3c]" : "bg-[#c5bfb5]"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-ud-ink truncate">
                          {job.service_type || `Untitled ${profile.labels.jobSingular.toLowerCase()}`}
                        </p>
                        <p className="text-[12px] text-ud-muted mt-0.5">
                          {customer?.name || "No customer linked"}
                        </p>
                      </div>
                      {job.job_value != null && (
                        <span className="text-[12px] font-semibold text-[#4A3FA8] shrink-0">
                          {formatCurrency(job.job_value)}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Pipeline snapshot */}
          <Card padding={0} radius="md" className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-[15px] border-b border-[rgba(0,0,0,0.045)]">
              <p className="text-[13.5px] font-semibold text-ud-ink">Pipeline snapshot</p>
              <Link href="/leads" className="inline-flex items-center rounded-[7px] border border-ud bg-ud-surface px-[11px] py-[5px] text-[12px] font-semibold text-ud-muted hover:bg-ud-surface-sunk">View all</Link>
            </div>
            {openLeads.length === 0 ? (
              <p className="px-5 py-6 text-center text-[13px] text-ud-faint">No open {profile.labels.leadPlural.toLowerCase()}.</p>
            ) : (
              <div>
                {openLeads.slice(0, 4).map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}/edit`}
                    className="flex items-center gap-[14px] px-5 py-[13px] border-b border-[rgba(0,0,0,0.04)] last:border-0 hover:bg-[rgba(0,0,0,0.012)] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-ud-ink truncate">
                        {lead.service_requested || `Untitled ${profile.labels.leadSingular.toLowerCase()}`}
                      </p>
                      <p className="text-[12px] text-ud-muted mt-0.5">
                        {lead.source || lead.status || "No source"} · {formatCurrency(lead.estimated_value)}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-[6px] bg-ud-surface-sunk px-2 py-0.5 text-[11px] font-semibold text-ud-muted shrink-0">
                      {lead.status || "Lead"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Quick actions */}
          <Card padding={0} radius="md" className="overflow-hidden">
            <div className="px-5 py-[15px] border-b border-[rgba(0,0,0,0.045)]">
              <p className="text-[13.5px] font-semibold text-ud-ink">Quick actions</p>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {[
                { label: "New client", href: "/customers" },
                { label: "Log a job", href: "/jobs" },
                { label: "Add follow-up", href: "/follow-ups" },
                { label: "Ask AI", href: "/ai-assistant" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-1.5 px-[13px] py-2 rounded-[9px] bg-ud-surface border border-ud text-[12.5px] font-semibold text-ud-text shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[rgba(0,0,0,0.14)] hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
