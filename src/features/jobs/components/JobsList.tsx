"use client";

import Link from "next/link";
import type { JobListRow, CustomerRow, LeadRow } from "../types";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { JobCreateForm } from "./JobCreateForm";
import { PageHeader } from "@/components/ui/PageHeader";

type Props = {
  jobs: JobListRow[];
  count: number;
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  leads: Pick<LeadRow, "id" | "service_requested" | "status" | "estimated_value">[];
  profile?: IndustryProfile;
  selectedStage: string;
};

function getWeekDays(today: Date): { name: string; num: number; date: Date }[] {
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return names.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { name, num: d.getDate(), date: d };
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatJobDate(startDate: string | null | undefined, today: Date): { label: string; isToday: boolean } {
  if (!startDate) return { label: "—", isToday: false };
  const d = new Date(startDate);
  if (isSameDay(d, today)) return { label: "Today", isToday: true };
  return {
    label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    isToday: false,
  };
}

function statusBadgeClass(status: string | null) {
  const s = (status || "").toLowerCase();
  if (s.includes("progress") || s.includes("active")) return "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-[#eef2ff] text-[#3730a3]";
  if (s.includes("complete") || s.includes("done")) return "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-success-bg text-ud-success";
  if (s.includes("cancel")) return "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-surface-sunk text-ud-muted";
  if (s.includes("quote") || s.includes("pending")) return "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-warning-bg text-ud-warning";
  return "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-surface-sunk text-ud-muted";
}

const btnPrimary = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-accent text-white hover:opacity-90 transition-opacity duration-[120ms]";

export function JobsList({ jobs, count, customers, leads, profile, selectedStage }: Props) {
  const jobPlural = profile?.labels.jobPlural ?? "Visits";
  const jobSingular = profile?.labels.jobSingular ?? "Visit";
  const customerById = new Map(customers.map((c) => [c.id, c]));
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

  const sorted = [...jobs]
    .filter((j) => !selectedStage || (j.status ?? "").toLowerCase() === selectedStage.toLowerCase())
    .sort((a, b) => {
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

  return (
    <div className="hidden md:block px-7 pb-10 pt-7">
      <PageHeader
        eyebrow={jobPlural}
        title={`Scheduled ${jobPlural.toLowerCase()}`}
        description={`${count} total · ${weekLabel} · ${totalThisWeek} scheduled this week${todayCount > 0 ? ` · ${todayCount} today` : ""}`}
        className="mb-6"
        actions={
          <a href="#job-quick-add" className={btnPrimary}>
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

      {/* Table */}
      <div className="overflow-hidden rounded-[var(--radius-ud-lg)] border border-[rgba(0,0,0,0.06)] shadow-ud">
        <table className="w-full border-collapse bg-ud-surface">
          <thead>
            <tr>
              {["Client", "Service", "Date & time", "Location", "Assigned to", "Status", ""].map((h) => (
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
                const customer = job.customer_id ? customerById.get(job.customer_id) : null;
                const { label: dateLabel, isToday } = formatJobDate(job.start_date, today);
                return (
                  <tr key={job.id}>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] font-semibold text-ud-ink">{customer?.name || `No ${profile?.labels.customerSingular?.toLowerCase() ?? "client"}`}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-text">{job.service_type || "—"}</td>
                    <td className={`px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] ${isToday ? "font-semibold text-ud-ink" : "text-ud-muted"}`}>{dateLabel}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">—</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">—</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]"><span className={statusBadgeClass(job.status)}>{job.status || "Scheduled"}</span></td>
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
        <JobCreateForm customers={customers} leads={leads} />
      </div>
    </div>
  );
}
