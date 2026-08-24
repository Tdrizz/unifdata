// Shared between WorkspaceView (desktop) and MobileWorkspaceView (mobile) so
// the two Home dashboards can't silently drift apart — same day/greeting
// labels, same follow-up due-date phrasing, and the same KPI numbers. This
// was previously duplicated function-for-function in both files; the mobile
// view ended up missing the stats desktop had simply because nothing forced
// an addition on one side to reach the other.
import { formatDateOnly, parseDateOnly, isOverdue, isDueToday } from "@/lib/date-format";
import { isClosedOpportunity, isUnpaid, isRecentActiveWork } from "@/lib/status";
import type { WorkspaceData } from "./queries";

export function getDayLabel(): string {
  const now = new Date();
  return now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getSortDate(date: string | null | undefined, fallback: string): number {
  const parsed = parseDateOnly(date || null);
  if (parsed) return parsed.getTime();
  return new Date(fallback).getTime();
}

export function getFollowUpLabel(date: string | null): string {
  if (!date) return "No due date";
  if (isOverdue(date)) return `Overdue ${formatDateOnly(date)}`;
  if (isDueToday(date)) return "Due today";
  return `Due ${formatDateOnly(date)}`;
}

export function getFollowUpTone(date: string | null): "neutral" | "danger" | "warning" {
  if (!date) return "neutral";
  if (isOverdue(date)) return "danger";
  if (isDueToday(date)) return "warning";
  return "neutral";
}

export function computeWorkspaceStats(data: Pick<WorkspaceData, "leads" | "jobs" | "sales">) {
  const { leads, jobs, sales } = data;

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

  return { openLeads, activeWork, unpaidRevenue, openPipelineValue, unpaidRevenueValue, revenueMTD };
}
