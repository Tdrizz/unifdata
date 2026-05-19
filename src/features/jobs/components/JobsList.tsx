"use client";

import Link from "next/link";
import type { JobListRow, CustomerRow, LeadRow } from "../types";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { JobCreateForm } from "./JobCreateForm";

type Props = {
  jobs: JobListRow[];
  count: number;
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  leads: Pick<LeadRow, "id" | "service_requested" | "status" | "estimated_value">[];
  profile?: IndustryProfile;
  selectedStage: string;
};

function getWeekDays(today: Date): { name: string; num: number; date: Date }[] {
  const dow = today.getDay(); // 0=Sun
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
  if (s.includes("progress") || s.includes("active")) return "badge badge-info";
  if (s.includes("complete") || s.includes("done")) return "badge badge-success";
  if (s.includes("cancel")) return "badge badge-neutral";
  if (s.includes("quote") || s.includes("pending")) return "badge badge-warning";
  return "badge badge-neutral";
}

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
    <div className="hidden md:block" style={{ padding: "28px 28px 40px" }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">{jobPlural}</div>
          <div className="page-title">Scheduled {jobPlural.toLowerCase()}</div>
          <div className="page-desc">
            {count} total · {weekLabel} · {totalThisWeek} scheduled this week{todayCount > 0 ? ` · ${todayCount} today` : ""}
          </div>
        </div>
        <div className="page-actions">
          <a href="#job-quick-add" className="btn btn-primary">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Log {jobSingular.toLowerCase()}
          </a>
        </div>
      </div>

      {/* Week strip */}
      <div className="week-strip">
        {weekDays.map(({ name, num, date }, i) => {
          const isToday = isSameDay(date, today);
          const cnt = countsByDay[i];
          return (
            <div key={name} className={`week-day${isToday ? " today" : ""}`}>
              <div className="week-day-name">{name}</div>
              <div className="week-day-num">{num}</div>
              {cnt > 0 ? (
                <>
                  <div className="week-day-count" style={{ color: "var(--accent)", fontWeight: 600 }}>
                    {cnt} {cnt === 1 ? jobSingular.toLowerCase() : jobPlural.toLowerCase()}
                  </div>
                  <div className="week-day-dot" />
                </>
              ) : (
                <div className="week-day-count">—</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Service</th>
              <th>Date &amp; time</th>
              <th>Location</th>
              <th>Assigned to</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="td-muted" style={{ textAlign: "center", padding: "24px" }}>
                  No {jobPlural.toLowerCase()} scheduled. <a href="#job-quick-add" className="td-link">Add one →</a>
                </td>
              </tr>
            ) : (
              sorted.map((job) => {
                const customer = job.customer_id ? customerById.get(job.customer_id) : null;
                const { label: dateLabel, isToday } = formatJobDate(job.start_date, today);
                return (
                  <tr key={job.id}>
                    <td className="td-primary">{customer?.name || `No ${profile?.labels.customerSingular?.toLowerCase() ?? "client"}`}</td>
                    <td>{job.service_type || "—"}</td>
                    <td style={isToday ? { fontWeight: 600, color: "var(--ink)" } : undefined} className={isToday ? undefined : "td-muted"}>
                      {dateLabel}
                    </td>
                    <td className="td-muted">—</td>
                    <td className="td-muted">—</td>
                    <td><span className={statusBadgeClass(job.status)}>{job.status || "Scheduled"}</span></td>
                    <td><Link href={`/jobs/${job.id}/edit`} className="td-link">View →</Link></td>
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
