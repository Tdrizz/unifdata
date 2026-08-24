"use client";

import { useState } from "react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { getWorkTone, getRevenueTone } from "@/lib/status";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { JobListRow, LeadRow } from "../types";
import type { ContactForSelect } from "@/lib/crm/types";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { useProfile } from "@/lib/profile-context";
import { JobCreateForm } from "./JobCreateForm";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  STAGE_FILTERS,
  matchesStageFilter,
  stageFilterFromParam,
  getWeekDays,
  isSameDay,
  formatJobDate,
  getJobContactId,
  sortJobsByStartDate,
} from "../compute";

type Props = {
  jobs: JobListRow[];
  count: number;
  contacts: ContactForSelect[];
  leads: Pick<LeadRow, "id" | "service_requested" | "status" | "estimated_value">[];
  profile?: IndustryProfile;
  selectedStage: string;
};

export function JobsList({ jobs, count, contacts, leads, profile, selectedStage }: Props) {
  const p = useProfile();
  const [activeFilter, setActiveFilter] = useState(stageFilterFromParam(selectedStage));
  const jobPlural = profile?.labels.jobPlural ?? p.labels.jobPlural;
  const jobSingular = profile?.labels.jobSingular ?? p.labels.jobSingular;
  const customerSingular = profile?.labels.customerSingular ?? p.labels.customerSingular;
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const today = new Date();
  const weekDays = getWeekDays(today);

  const weekStart = weekDays[0].date;
  const weekEnd = weekDays[6].date;
  const weekLabel = `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${weekEnd.getDate()}`;

  const countsByDay = weekDays.map(({ date }) =>
    jobs.filter((j) => j.start_date && isSameDay(new Date(j.start_date), date)).length
  );

  const todayCount = countsByDay[weekDays.findIndex((d) => isSameDay(d.date, today))] ?? 0;
  const totalThisWeek = countsByDay.reduce((a, b) => a + b, 0);

  const sorted = sortJobsByStartDate(jobs.filter((j) => matchesStageFilter(j.status, activeFilter)));

  return (
    <div className="hidden md:block px-8 pt-7 pb-12">
      <PageHeader
        eyebrow={jobPlural}
        title={`Scheduled ${jobPlural.toLowerCase()}`}
        description={`${count} total · ${weekLabel} · ${totalThisWeek} scheduled this week${todayCount > 0 ? ` · ${todayCount} today` : ""}`}
        className="mb-6"
        actions={
          <a href="#job-quick-add" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-accent text-white hover:opacity-90 transition-opacity duration-[120ms]">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Log {jobSingular.toLowerCase()}
          </a>
        }
      />

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-2 mb-5">
        {weekDays.map(({ name, num, date }, i) => {
          const isToday = isSameDay(date, today);
          const cnt = countsByDay[i];
          return (
            <div
              key={name}
              className={`bg-ud-surface border rounded-[10px] px-2 py-[10px] text-center shadow-ud ${isToday ? "border-ud-accent bg-ud-accent-tint" : "border-ud"}`}
            >
              <div className={`text-[10px] font-bold uppercase tracking-[0.08em] ${isToday ? "text-ud-accent" : "text-ud-faint"}`}>{name}</div>
              <div className="text-[17px] font-bold text-ud-ink my-[3px]">{num}</div>
              {cnt > 0 ? (
                <>
                  <div className="text-[11px] text-ud-muted" style={{ color: "var(--accent)", fontWeight: 600 }}>
                    {cnt} {cnt === 1 ? jobSingular.toLowerCase() : jobPlural.toLowerCase()}
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-ud-accent mx-auto mt-1" />
                </>
              ) : (
                <div className="text-[11px] text-ud-muted">—</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stage filter chips — same filter mobile has, now backed by shared logic */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STAGE_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            className={cn(
              "rounded-full px-[14px] py-[7px] text-[12.5px] font-semibold transition-colors",
              activeFilter === f
                ? "bg-ud-ink text-white"
                : "bg-ud-surface border border-ud text-ud-muted hover:border-ud-hard",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[var(--radius-ud-lg)] border border-[rgba(0,0,0,0.06)] shadow-ud">
        <table className="w-full border-collapse bg-ud-surface">
          <thead>
            <tr>
              {[customerSingular, "Service", "Value", "Paid", "Date & time", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-[10px] text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint bg-[rgba(0,0,0,0.015)] border-b border-ud whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child_td]:border-b-0 [&_tr:hover_td]:bg-[rgba(0,0,0,0.012)]">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted text-center py-6">
                  No {jobPlural.toLowerCase()} scheduled.{" "}
                  <a href="#job-quick-add" className="text-ud-accent no-underline font-medium text-[12px] hover:underline">Add one →</a>
                </td>
              </tr>
            ) : (
              sorted.map((job) => {
                const jobContactId = getJobContactId(job);
                const customer = jobContactId ? contactById.get(jobContactId) : null;
                const { label: dateLabel, isToday } = formatJobDate(job.start_date, today);
                return (
                  <tr key={job.id}>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] font-semibold text-ud-ink">{customer?.name || `No ${customerSingular.toLowerCase()}`}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-text">{job.service_type || "—"}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] font-semibold text-ud-ink [font-variant-numeric:tabular-nums]">{job.job_value != null ? formatCurrency(job.job_value) : "—"}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]">{job.paid_status ? <StatusBadge tone={getRevenueTone(job.paid_status)}>{job.paid_status}</StatusBadge> : <span className="text-ud-muted">—</span>}</td>
                    <td className={`px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] ${isToday ? "font-semibold text-ud-ink" : "text-ud-muted"}`}>{dateLabel}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]"><StatusBadge tone={getWorkTone(job.status)}>{job.status || "Scheduled"}</StatusBadge></td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]"><Link href={`/jobs/${job.id}/edit`} className="text-ud-accent no-underline font-medium text-[12px] hover:underline">View →</Link></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick add */}
      <div id="job-quick-add" style={{ marginTop: "20px" }}>
        <JobCreateForm leads={leads} />
      </div>
    </div>
  );
}
