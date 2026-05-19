"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { parseDateOnly, getTodayDateOnly, formatDateOnly } from "@/lib/date-format";
import { isClosedOpportunity } from "@/lib/status";
import type { FollowUpRow, LeadRow, CustomerRow } from "../types";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { markFollowUpCompleteAction } from "../actions";
import { FollowUpCreateForm } from "./FollowUpCreateForm";

type Props = {
  followUps: FollowUpRow[];
  opportunities: LeadRow[];
  people: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  profile?: IndustryProfile;
};

type FilterType = "all" | "overdue" | "today" | "upcoming";

function isComplete(status: string | null) {
  const s = (status || "").toLowerCase();
  return s.includes("complete") || s.includes("done") || s.includes("closed");
}

function isOverdue(date: string | null, status: string | null) {
  const target = parseDateOnly(date);
  if (!target || isComplete(status)) return false;
  return target < getTodayDateOnly();
}

function isDueToday(date: string | null, status: string | null) {
  const target = parseDateOnly(date);
  if (!target || isComplete(status)) return false;
  return target.getTime() === getTodayDateOnly().getTime();
}

function isUpcoming(date: string | null, status: string | null) {
  const target = parseDateOnly(date);
  if (!target || isComplete(status)) return false;
  return target > getTodayDateOnly();
}

function getDotClass(date: string | null, status: string | null) {
  if (isOverdue(date, status)) return "queue-dot queue-dot-danger";
  if (isDueToday(date, status)) return "queue-dot queue-dot-warning";
  return "queue-dot queue-dot-neutral";
}

function getDueClass(date: string | null, status: string | null) {
  if (isOverdue(date, status)) return "queue-due queue-due-danger";
  if (isDueToday(date, status)) return "queue-due queue-due-warning";
  return "queue-due queue-due-ok";
}

function getDueLabel(date: string | null, status: string | null): string {
  if (!date) return "No due date";
  if (isOverdue(date, status)) {
    const days = Math.floor((getTodayDateOnly().getTime() - parseDateOnly(date)!.getTime()) / 86400000);
    return `${days}d overdue`;
  }
  if (isDueToday(date, status)) return "Due today";
  const target = parseDateOnly(date);
  if (target) {
    const days = Math.floor((target.getTime() - getTodayDateOnly().getTime()) / 86400000);
    return `In ${days} day${days === 1 ? "" : "s"}`;
  }
  return formatDateOnly(date) ?? "—";
}

type QueueEntry = {
  id: string;
  title: string;
  meta: string;
  due_date: string | null;
  status: string | null;
  href: string;
  priority: number;
};

export function FollowUpsView({ followUps, opportunities, people, profile }: Props) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [, startTransition] = useTransition();

  const personById = new Map(people.map((p) => [p.id, p]));

  const manualEntries: QueueEntry[] = followUps
    .filter((f) => !isComplete(f.status))
    .map((f) => {
      const person = f.customer_id ? personById.get(f.customer_id) : null;
      return {
        id: `manual-${f.id}`,
        title: f.message || `Untitled ${profile?.labels.followUpSingular?.toLowerCase() ?? "follow-up"}`,
        meta: person?.name || `No ${profile?.labels.customerSingular?.toLowerCase() ?? "contact"} linked`,
        due_date: f.due_date,
        status: f.status,
        href: `/follow-ups/${f.id}/edit`,
        priority: isOverdue(f.due_date, f.status) ? 0 : isDueToday(f.due_date, f.status) ? 1 : isUpcoming(f.due_date, f.status) ? 2 : 3,
      };
    });

  const opportunityEntries: QueueEntry[] = opportunities
    .filter((o) => !isClosedOpportunity(o.status) && Boolean(o.next_follow_up_date))
    .map((o) => {
      const person = o.customer_id ? personById.get(o.customer_id) : null;
      return {
        id: `opportunity-${o.id}`,
        title: o.service_requested ? `Follow up: ${o.service_requested}` : "Follow up on opportunity",
        meta: person?.name || `No ${profile?.labels.customerSingular?.toLowerCase() ?? "contact"} linked`,
        due_date: o.next_follow_up_date,
        status: o.status,
        href: `/leads/${o.id}/edit`,
        priority: isOverdue(o.next_follow_up_date, o.status) ? 0 : isDueToday(o.next_follow_up_date, o.status) ? 1 : isUpcoming(o.next_follow_up_date, o.status) ? 2 : 3,
      };
    });

  const all = [...manualEntries, ...opportunityEntries].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const ad = parseDateOnly(a.due_date);
    const bd = parseDateOnly(b.due_date);
    if (ad && bd) return ad.getTime() - bd.getTime();
    return 0;
  });

  const overdueItems = all.filter((i) => isOverdue(i.due_date, i.status));
  const todayItems = all.filter((i) => isDueToday(i.due_date, i.status));
  const upcomingItems = all.filter((i) => isUpcoming(i.due_date, i.status));

  const filtered = filter === "overdue" ? overdueItems : filter === "today" ? todayItems : filter === "upcoming" ? upcomingItems : all;

  return (
    <div className="hidden md:block" style={{ padding: "28px 28px 40px" }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">{profile?.labels.followUpPlural ?? "Follow-ups"}</div>
          <div className="page-title">Priority queue</div>
          <div className="page-desc">
            {all.length} open · {overdueItems.length} overdue · {todayItems.length} due today
          </div>
        </div>
        <div className="page-actions">
          <Link href="/crm" className="btn btn-ghost">Pipeline view</Link>
          <a href="#followup-quick-add" className="btn btn-primary">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add follow-up
          </a>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs mb-4">
        <button className={`filter-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          All <span style={{ color: "var(--faint)", fontWeight: 500 }}>{all.length}</span>
        </button>
        <button className={`filter-tab ${filter === "overdue" ? "active" : ""}`} onClick={() => setFilter("overdue")}>
          Overdue <span style={{ color: "var(--danger)", fontWeight: 600 }}>{overdueItems.length}</span>
        </button>
        <button className={`filter-tab ${filter === "today" ? "active" : ""}`} onClick={() => setFilter("today")}>
          Due today <span style={{ color: "var(--warning)", fontWeight: 600 }}>{todayItems.length}</span>
        </button>
        <button className={`filter-tab ${filter === "upcoming" ? "active" : ""}`} onClick={() => setFilter("upcoming")}>
          Upcoming <span style={{ color: "var(--faint)", fontWeight: 500 }}>{upcomingItems.length}</span>
        </button>
      </div>

      {/* Queue card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Follow-up queue</div>
            <div className="card-desc">Ordered by urgency</div>
          </div>
        </div>
        <div>
          {filtered.length === 0 ? (
            <div className="queue-item">
              <div className="queue-body">
                <div className="queue-meta" style={{ textAlign: "center", padding: "12px 0" }}>
                  {`No ${profile?.labels.followUpPlural?.toLowerCase() ?? "follow-ups"} in this category.`}
                </div>
              </div>
            </div>
          ) : (
            filtered.map((item) => {
              const isManual = item.id.startsWith("manual-");
              const rawId = isManual ? item.id.replace("manual-", "") : null;
              return (
                <Link key={item.id} href={item.href} style={{ textDecoration: "none" }}>
                  <div className="queue-item">
                    <div className={getDotClass(item.due_date, item.status)} />
                    <div className="queue-body">
                      <div className="queue-action">{item.title}</div>
                      <div className="queue-meta">{item.meta}</div>
                    </div>
                    <div className={getDueClass(item.due_date, item.status)} style={{ marginRight: "12px" }}>
                      {getDueLabel(item.due_date, item.status)}
                    </div>
                    {isManual && rawId && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          startTransition(() => markFollowUpCompleteAction(rawId));
                        }}
                      >
                        Done
                      </button>
                    )}
                    {!isManual && (
                      <span className="btn btn-ghost btn-sm">View →</span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Quick add */}
      <div id="followup-quick-add" style={{ marginTop: "20px" }}>
        <FollowUpCreateForm people={people} />
      </div>
    </div>
  );
}
