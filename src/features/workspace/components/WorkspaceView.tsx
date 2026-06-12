"use client";

import Link from "next/link";
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
import { KpiCard } from "@/components/ui/KpiCard";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Pill } from "@/components/ui/Pill";
import { PageHeader } from "@/components/ui/PageHeader";

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
  isPro?: boolean;
};

export function WorkspaceView({ customers, leads, jobs, sales, followUps, profile, companyName, drafts = [], alerts = [], isPro = false }: Props) {
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const openLeads = leads.filter((lead) => !isClosedOpportunity(lead.status));
  const activeWork = jobs.filter((work) => isRecentActiveWork(work.status, work.start_date));
  const unpaidRevenue = sales.filter((record) => isUnpaid(record.payment_status));

  const openPipelineValue = openLeads.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
  const unpaidRevenueValue = unpaidRevenue.reduce((sum, record) => sum + Number(record.amount || 0), 0);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const revenueMTD = sales
    .filter((s) => new Date(s.sale_date || s.created_at) >= startOfMonth)
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const manualFollowUpItems: QueueItem[] = followUps
    .filter((action) => isOpenFollowUp(action.status))
    .map((action) => ({
      id: `manual-follow-up-${action.id}`,
      label: getFollowUpLabel(action.due_date),
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
      label: getFollowUpLabel(lead.next_follow_up_date),
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
    detail: `${formatCurrency(record.amount)} unpaid`,
    href: `/sales/${record.id}/edit`,
    tone: "danger" as const,
    priority: 1,
  }));

  const dataIssueCount =
    customers.filter((c) => !c.phone || !c.email).length +
    customers.filter((c) => !c.address).length +
    openLeads.filter((l) => !l.contact_id && !l.customer_id).length +
    openLeads.filter((l) => !l.source).length +
    openLeads.filter((l) => l.estimated_value === null || l.estimated_value === undefined).length +
    jobs.filter((w) => w.job_value === null || w.job_value === undefined).length;

  const cleanupItems: QueueItem[] =
    dataIssueCount > 0
      ? [{
          id: "data-cleanup-summary",
          label: "Data cleanup",
          title: `${dataIssueCount} data issues to fix`,
          detail: "Missing contact info, values, or links.",
          href: "/data-hub",
          tone: "neutral" as const,
          priority: 5,
        }]
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

  const dayLabel = getDayLabel();
  const jobPlural = profile.labels.jobPlural;
  const jobSingular = profile.labels.jobSingular;
  const leadPlural = profile.labels.leadPlural;
  const customerSingular = profile.labels.customerSingular;
  const followUpPlural = profile.labels.followUpPlural;

  const overdueCount = followUpSchedule.filter((i) => i.priority === 0).length;
  const dueTodayCount = followUpSchedule.filter((i) => i.priority === 1).length;

  const statusLine = (() => {
    const parts: string[] = [];
    if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
    if (dueTodayCount > 0) parts.push(`${dueTodayCount} due today`);
    if (activeWork.length > 0) parts.push(`${activeWork.length} ${jobPlural.toLowerCase()} active`);
    if (unpaidRevenueValue > 0) parts.push(`${formatCurrency(unpaidRevenueValue)} outstanding`);
    if (parts.length === 0 && revenueMTD > 0) parts.push(`${formatCurrency(revenueMTD)} this month`);
    return parts.length > 0 ? parts.join(" · ") : "Nothing urgent today";
  })();

  return (
    <div className="hidden md:block px-7 pb-10 pt-7">
      {/* Page header */}
      <PageHeader
        eyebrow={dayLabel}
        title={`${getGreeting()}, ${companyName}.`}
        description={statusLine}
        className="mb-6"
        actions={
          <>
            <Link href="/jobs" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-transparent text-ud-text border border-transparent hover:bg-ud-surface-sunk px-2.5 py-1.5 text-xs rounded-[8px]">View calendar</Link>
            <Link href="/customers" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-ud-surface text-ud-ink border border-ud shadow-ud hover:border-ud-hard px-3 py-2 text-[13px] rounded-[9px]">
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Quick add
            </Link>
          </>
        }
      />

      {/* Aria briefing card */}
      {isPro && (drafts.length + alerts.length > 0) && (
        <Link
          href="/aria"
          className="flex items-center justify-between gap-4 mb-6 rounded-[12px] border border-ud-accent/20 bg-ud-accent/[0.03] px-5 py-4 hover:bg-ud-accent/[0.06] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-ud-accent/10 flex items-center justify-center shrink-0">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="text-ud-accent">
                <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
                <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z"/>
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-ud-ink">
                Aria found {drafts.length + alerts.length} {drafts.length + alerts.length === 1 ? "item" : "items"} to review
              </p>
              <p className="text-[12px] text-ud-muted mt-0.5">
                {drafts.length > 0 && `${drafts.length} draft${drafts.length !== 1 ? "s" : ""} ready to send`}
                {drafts.length > 0 && alerts.length > 0 && " · "}
                {alerts.length > 0 && `${alerts.length} alert${alerts.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <span className="text-[12.5px] font-semibold text-ud-accent group-hover:translate-x-[2px] transition-transform shrink-0">
            Review →
          </span>
        </Link>
      )}
      {isPro && drafts.length === 0 && alerts.length === 0 && (
        <div className="flex items-center gap-3 mb-6 rounded-[12px] border border-ud px-5 py-4">
          <div className="w-7 h-7 rounded-full bg-ud-surface-sunk flex items-center justify-center shrink-0">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="text-ud-faint">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
            </svg>
          </div>
          <p className="text-[13px] text-ud-muted">Aria reviewed your business overnight. Everything looks good.</p>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <KpiCard
          label={`Active ${jobPlural}`}
          value={activeWork.length}
          helper={activeWork.length > 0 ? `${activeWork.length} in progress` : "None scheduled"}
        />
        <KpiCard
          label="Open Pipeline"
          value={formatCurrency(openPipelineValue)}
          helper={`${openLeads.length} active ${leadPlural.toLowerCase()}`}
        />
        <KpiCard
          label="Unpaid Revenue"
          value={formatCurrency(unpaidRevenueValue)}
          helper={unpaidRevenue.length > 0 ? `${unpaidRevenue.length} outstanding` : "All clear"}
          delta={unpaidRevenue.length > 0 ? `${unpaidRevenue.length} out` : undefined}
          deltaTone={unpaidRevenue.length > 0 ? "down" : "flat"}
        />
        <KpiCard
          label={`${followUpPlural} Due`}
          value={followUpSchedule.length}
          helper={`${overdueCount} overdue · ${dueTodayCount} due today`}
          delta={overdueCount > 0 ? `${overdueCount} overdue` : undefined}
          deltaTone={overdueCount > 0 ? "down" : "flat"}
        />
        <KpiCard
          label="Revenue This Month"
          value={formatCurrency(revenueMTD)}
          helper="Month to date"
          delta={revenueMTD > 0 ? "this month" : undefined}
          deltaTone={revenueMTD > 0 ? "up" : "flat"}
        />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-[1.2fr_0.8fr] gap-5 items-start">
        {/* Priority queue */}
        <Card padding={0} radius="md" className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-[22px] py-4 border-b border-ud-soft">
            <p className="text-[13.5px] font-semibold text-ud-ink">Priority queue</p>
            <Link href="/follow-ups" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-transparent text-ud-text border border-transparent hover:bg-ud-surface-sunk px-2.5 py-1.5 text-xs rounded-[8px]">View all</Link>
          </div>
          {priorityQueue.length === 0 ? (
            <p className="px-5 py-5 text-sm text-ud-muted text-center">Nothing needs attention right now.</p>
          ) : (
            priorityQueue.map((item, idx) => (
              <Link key={item.id} href={item.href}>
                <ListRow
                  leading={<Pill tone={item.tone}>{item.label}</Pill>}
                  title={item.title}
                  subtitle={item.detail}
                  isLast={idx === priorityQueue.length - 1}
                  onClick={() => {}}
                />
              </Link>
            ))
          )}
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Jobs today */}
          <Card padding={0} radius="md" className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-[22px] py-4 border-b border-ud-soft">
              <p className="text-[13.5px] font-semibold text-ud-ink">{jobPlural} today</p>
              <Link href="/jobs" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-transparent text-ud-text border border-transparent hover:bg-ud-surface-sunk px-2.5 py-1.5 text-xs rounded-[8px]">Calendar</Link>
            </div>
            {activeWork.length === 0 ? (
              <p className="px-5 py-5 text-sm text-ud-muted">No active {jobPlural.toLowerCase()} right now.</p>
            ) : (
              activeWork.slice(0, 5).map((job, idx) => {
                const customer =
                  (job.contact_id ? customerById.get(job.contact_id) : null) ??
                  (job.customer_id ? customerById.get(job.customer_id) : null);
                const tone = getWorkTone(job.status);
                return (
                  <Link key={job.id} href={`/jobs/${job.id}/edit`}>
                    <ListRow
                      leading={<Pill tone={tone}>{job.status || "Active"}</Pill>}
                      title={job.service_type || `Untitled ${jobSingular.toLowerCase()}`}
                      subtitle={customer?.name || `No ${customerSingular.toLowerCase()}`}
                      isLast={idx === Math.min(activeWork.length, 5) - 1}
                      onClick={() => {}}
                    />
                  </Link>
                );
              })
            )}
          </Card>

          {/* Pipeline snapshot */}
          <Card padding={0} radius="md" className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-[22px] py-4 border-b border-ud-soft">
              <p className="text-[13.5px] font-semibold text-ud-ink">Pipeline snapshot</p>
              <Link href="/crm" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-transparent text-ud-text border border-transparent hover:bg-ud-surface-sunk px-2.5 py-1.5 text-xs rounded-[8px]">View all</Link>
            </div>
            {openLeads.length === 0 ? (
              <p className="px-5 py-5 text-sm text-ud-muted">No open {leadPlural.toLowerCase()}.</p>
            ) : (
              openLeads.slice(0, 4).map((lead, idx) => (
                <Link key={lead.id} href={`/leads/${lead.id}/edit`}>
                  <ListRow
                    trailing={<Pill tone="neutral">{lead.status || "Lead"}</Pill>}
                    title={lead.service_requested || `Untitled ${profile.labels.leadSingular.toLowerCase()}`}
                    subtitle={`${lead.status || "Lead"} · ${formatCurrency(lead.estimated_value)}`}
                    isLast={idx === Math.min(openLeads.length, 4) - 1}
                    onClick={() => {}}
                  />
                </Link>
              ))
            )}
          </Card>

          {/* Quick actions */}
          <Card padding={16} radius="md">
            <p className="text-[13.5px] font-semibold text-ud-ink mb-3">Quick actions</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: `New ${customerSingular.toLowerCase()}`, href: "/customers" },
                { label: `Log a ${jobSingular.toLowerCase()}`, href: "/jobs#job-quick-add" },
                { label: `Add ${followUpPlural.toLowerCase()}`, href: "/follow-ups#followup-quick-add" },
                { label: "Ask AI", href: "/ai-assistant" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-ud-surface border border-ud text-[12.5px] font-semibold text-ud-text shadow-ud hover:border-ud-hard hover:text-ud-ink transition-[border-color,color] duration-[120ms]"
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className="text-ud-accent">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
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
