export const STAGE_FILTERS = ["All", "Scheduled", "Active", "Complete", "Cancelled"] as const;
export type StageFilter = (typeof STAGE_FILTERS)[number];

export function matchesStageFilter(status: string | null | undefined, filter: StageFilter): boolean {
  if (filter === "All") return true;
  const s = String(status || "").toLowerCase();
  if (filter === "Scheduled") return s.includes("scheduled");
  if (filter === "Active") return s.includes("active") || s.includes("progress");
  if (filter === "Complete") return s.includes("complete") || s.includes("done") || s.includes("finished");
  if (filter === "Cancelled") return s.includes("cancel");
  return false;
}

export function stageFilterFromParam(selectedStage: string): StageFilter {
  const match = STAGE_FILTERS.find((f) => f.toLowerCase() === selectedStage.toLowerCase());
  return match ?? "All";
}

export function getWeekDays(today: Date): { name: string; num: number; date: Date }[] {
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

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatJobDate(startDate: string | null | undefined, today: Date): { label: string; isToday: boolean } {
  if (!startDate) return { label: "—", isToday: false };
  const d = new Date(startDate);
  if (isSameDay(d, today)) return { label: "Today", isToday: true };
  return {
    label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    isToday: false,
  };
}

export function getJobContactId(job: { contact_id?: string | null; customer_id?: string | null }): string | null {
  return job.contact_id ?? job.customer_id ?? null;
}

export function sortJobsByStartDate<T extends { start_date: string | null }>(jobs: T[]): T[] {
  return [...jobs].sort((a, b) => {
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });
}
