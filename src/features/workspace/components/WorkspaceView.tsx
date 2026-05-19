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

function dotClass(tone: string) {
  if (tone === "danger") return "queue-dot queue-dot-danger";
  if (tone === "warning") return "queue-dot queue-dot-warning";
  if (tone === "success") return "queue-dot queue-dot-success";
  return "queue-dot queue-dot-neutral";
}

function dueClass(tone: string) {
  if (tone === "danger") return "queue-due queue-due-danger";
  if (tone === "warning") return "queue-due queue-due-warning";
  return "queue-due queue-due-ok";
}

type Props = WorkspaceData & { profile: IndustryProfile; companyName: string };

export function WorkspaceView({ customers, leads, jobs, sales, followUps, profile, companyName }: Props) {
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
    openLeads.filter((l) => !l.customer_id).length +
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
  const salePlural = profile.labels.salePlural;
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
    <div className="hidden md:block" style={{ padding: "28px 28px 40px" }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">{dayLabel}</div>
          <div className="page-title">{getGreeting()}, {companyName}.</div>
          <div className="page-desc">{statusLine}</div>
        </div>
        <div className="page-actions">
          <Link href="/jobs" className="btn btn-ghost">View calendar</Link>
          <Link href="/customers" className="btn btn-primary">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Quick add
          </Link>
        </div>
      </div>

      {/* Stat row */}
      <div className="stat-row stat-row-5">
        <div className={`stat-card ${followUpSchedule.length > 0 ? "s-danger" : ""}`}>
          <div className="stat-label">{followUpPlural} due</div>
          <div className={`stat-value ${followUpSchedule.length > 0 ? "c-danger" : ""}`}>{followUpSchedule.length}</div>
          <div className="stat-helper">{overdueCount} overdue · {dueTodayCount} due today</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{jobPlural} today</div>
          <div className="stat-value">{activeWork.length}</div>
          <div className="stat-helper">{activeWork.length > 0 ? `${activeWork.length} active` : "None scheduled"}</div>
        </div>
        <div className={`stat-card ${revenueMTD > 0 ? "s-success" : ""}`}>
          <div className="stat-label">Revenue MTD</div>
          <div className={`stat-value ${revenueMTD > 0 ? "c-success" : ""}`}>{formatCurrency(revenueMTD)}</div>
          <div className="stat-helper">This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open pipeline</div>
          <div className="stat-value">{formatCurrency(openPipelineValue)}</div>
          <div className="stat-helper">{openLeads.length} active {leadPlural.toLowerCase()}</div>
        </div>
        <div className={`stat-card ${unpaidRevenueValue > 0 ? "s-danger" : ""}`}>
          <div className="stat-label">Unpaid {salePlural.toLowerCase()}</div>
          <div className={`stat-value ${unpaidRevenueValue > 0 ? "c-danger" : ""}`}>{formatCurrency(unpaidRevenueValue)}</div>
          <div className="stat-helper">{unpaidRevenue.length > 0 ? `${unpaidRevenue.length} outstanding` : "All clear"}</div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid-2">
        {/* Priority queue */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Priority queue</div>
            <Link href="/follow-ups" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {priorityQueue.length === 0 ? (
            <div className="queue-item">
              <div className="queue-body">
                <div className="queue-meta" style={{ textAlign: "center", padding: "12px 0" }}>Nothing needs attention right now.</div>
              </div>
            </div>
          ) : (
            priorityQueue.map((item) => (
              <Link key={item.id} href={item.href} style={{ textDecoration: "none" }}>
                <div className="queue-item">
                  <div className={dotClass(item.tone)} />
                  <div className="queue-body">
                    <div className="queue-action">{item.title}</div>
                    <div className="queue-meta">{item.detail}</div>
                  </div>
                  <div className={dueClass(item.tone)}>{item.label}</div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Right column */}
        <div className="col-stack">
          {/* Jobs today */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">{jobPlural} today</div>
              <Link href="/jobs" className="btn btn-ghost btn-sm">Calendar</Link>
            </div>
            {activeWork.length === 0 ? (
              <div className="queue-item">
                <div className="queue-body">
                  <div className="queue-meta">No active {jobPlural.toLowerCase()} right now.</div>
                </div>
              </div>
            ) : (
              activeWork.slice(0, 5).map((job) => {
                const customer = job.customer_id ? customerById.get(job.customer_id) : null;
                const tone = getWorkTone(job.status);
                return (
                  <Link key={job.id} href={`/jobs/${job.id}/edit`} style={{ textDecoration: "none" }}>
                    <div className="queue-item">
                      <div className={dotClass(tone)} />
                      <div className="queue-body">
                        <div className="queue-action">{job.service_type || `Untitled ${jobSingular.toLowerCase()}`}</div>
                        <div className="queue-meta">{customer?.name || `No ${customerSingular.toLowerCase()}`}</div>
                      </div>
                      <span className="badge badge-info">{job.status || "Active"}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Pipeline snapshot */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Pipeline snapshot</div>
              <Link href="/crm" className="btn btn-ghost btn-sm">View all</Link>
            </div>
            {openLeads.length === 0 ? (
              <div className="queue-item">
                <div className="queue-body">
                  <div className="queue-meta">No open {leadPlural.toLowerCase()}.</div>
                </div>
              </div>
            ) : (
              openLeads.slice(0, 4).map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}/edit`} style={{ textDecoration: "none" }}>
                  <div className="queue-item">
                    <div className="queue-body">
                      <div className="queue-action">{lead.service_requested || `Untitled ${profile.labels.leadSingular.toLowerCase()}`}</div>
                      <div className="queue-meta">{lead.status || "Lead"} · {formatCurrency(lead.estimated_value)}</div>
                    </div>
                    <span className="badge badge-neutral">{lead.status || "Lead"}</span>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Quick actions */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Quick actions</div>
            </div>
            <div className="card-body" style={{ padding: "16px" }}>
              <div className="quick-actions">
                {[
                  { label: `New ${customerSingular.toLowerCase()}`, href: "/customers#customer-quick-add" },
                  { label: `Log a ${jobSingular.toLowerCase()}`, href: "/jobs#job-quick-add" },
                  { label: `Add ${followUpPlural.toLowerCase()}`, href: "/follow-ups#followup-quick-add" },
                  { label: "Ask AI", href: "/ai-assistant" },
                ].map((action) => (
                  <Link key={action.label} href={action.href} className="quick-action" style={{ textDecoration: "none" }}>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
