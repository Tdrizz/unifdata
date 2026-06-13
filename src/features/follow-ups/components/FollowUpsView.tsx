"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { parseDateOnly, getTodayDateOnly, formatDateOnly } from "@/lib/date-format";
import { isClosedOpportunity } from "@/lib/status";
import type { FollowUpRow, LeadRow } from "../types";
import type { ContactForSelect } from "@/lib/crm/types";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { markFollowUpCompleteAction } from "../actions";
import { FollowUpCreateForm } from "./FollowUpCreateForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterChip } from "@/components/ui/FilterChip";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";

type Props = {
  followUps: FollowUpRow[];
  opportunities: LeadRow[];
  people: ContactForSelect[];
  profile?: IndustryProfile;
  count?: number;
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
  if (isOverdue(date, status)) return "w-2 h-2 rounded-full bg-ud-danger shrink-0";
  if (isDueToday(date, status)) return "w-2 h-2 rounded-full bg-ud-warning shrink-0";
  return "w-2 h-2 rounded-full bg-ud-surface-sunk shrink-0";
}

function getDueClass(date: string | null, status: string | null) {
  if (isOverdue(date, status)) return "text-[12px] font-semibold text-ud-danger shrink-0";
  if (isDueToday(date, status)) return "text-[12px] font-semibold text-ud-warning shrink-0";
  return "text-[12px] font-semibold text-ud-muted shrink-0";
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


export function FollowUpsView({ followUps, opportunities, people, profile, count = 0 }: Props) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [, startTransition] = useTransition();

  const personById = new Map(people.map((p) => [p.id, p]));

  const manualEntries: QueueEntry[] = followUps
    .filter((f) => !isComplete(f.status))
    .map((f) => {
      const person = (f.contact_id ?? f.customer_id) ? personById.get(f.contact_id ?? f.customer_id ?? "") : null;
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
      const person = o.customer_id ? personById.get(o.customer_id) : null; // leads still use customer_id from legacy customers table
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
    <div className="hidden md:block px-8 pt-7 pb-12">
      <PageHeader
        eyebrow={profile?.labels.followUpPlural ?? "Follow-ups"}
        title="Priority queue"
        description={`${all.length} open · ${overdueItems.length} overdue · ${todayItems.length} due today`}
        className="mb-6"
        actions={
          <>
            <Link href="/crm" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms]">Pipeline view</Link>
            <a href="#followup-quick-add" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-accent text-white hover:opacity-90 transition-opacity duration-[120ms]">
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add follow-up
            </a>
          </>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-0.5 bg-ud-surface-sunk rounded-[9px] p-[3px] border border-ud w-fit mb-4">
        <FilterChip active={filter === "all"} count={all.length} onClick={() => setFilter("all")}>All</FilterChip>
        <FilterChip active={filter === "overdue"} count={overdueItems.length} onClick={() => setFilter("overdue")}>Overdue</FilterChip>
        <FilterChip active={filter === "today"} count={todayItems.length} onClick={() => setFilter("today")}>Due today</FilterChip>
        <FilterChip active={filter === "upcoming"} count={upcomingItems.length} onClick={() => setFilter("upcoming")}>Upcoming</FilterChip>
      </div>

      {/* Queue card */}
      <Card padding={0} radius="md" className="overflow-hidden">
        <div className="px-[22px] py-4 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-semibold text-ud-ink">Follow-up queue</p>
            <p className="text-[12px] text-ud-muted mt-0.5">Ordered by urgency</p>
          </div>
        </div>
        <div>
          {filtered.length === 0 ? (
            <div className="flex items-center gap-3.5 px-5 py-[14px]">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-ud-muted text-center py-3">
                  {`No ${profile?.labels.followUpPlural?.toLowerCase() ?? "follow-ups"} in this category.`}
                </p>
              </div>
            </div>
          ) : (
            filtered.map((item) => {
              const isManual = item.id.startsWith("manual-");
              const rawId = isManual ? item.id.replace("manual-", "") : null;
              return (
                <Link key={item.id} href={item.href} style={{ textDecoration: "none" }}>
                  <div className="flex items-center gap-3.5 px-5 py-[14px] border-b border-[rgba(0,0,0,0.04)] last:border-b-0 hover:bg-[rgba(0,0,0,0.015)] transition-colors">
                    <div className={getDotClass(item.due_date, item.status)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-ud-ink truncate">{item.title}</p>
                      <p className="text-[12px] text-ud-muted mt-0.5">{item.meta}</p>
                    </div>
                    <div className={getDueClass(item.due_date, item.status)} style={{ marginRight: "12px" }}>
                      {getDueLabel(item.due_date, item.status)}
                    </div>
                    {isManual && rawId && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          startTransition(() => markFollowUpCompleteAction(rawId));
                        }}
                      >
                        Done
                      </Button>
                    )}
                    {!isManual && (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms]">View →</span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </Card>

      <div className="mt-4">
        <Pagination count={count} pageSize={50} />
      </div>

      {/* Quick add */}
      <div id="followup-quick-add" style={{ marginTop: "20px" }}>
        <FollowUpCreateForm people={people} />
      </div>
    </div>
  );
}
