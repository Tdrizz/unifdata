type Tone = "success" | "warning" | "danger" | "neutral";

// Health score tier weights for consistent scoring across workspace and data-hub
export const HEALTH_WEIGHTS = {
  critical: 3,   // Missing customer link on lead/job, missing amount on sale
  important: 2,  // Missing estimated value, follow-up date, job value
  cosmetic: 0.5, // Missing source, address, type, notes
  multiplier: 12,
} as const;

export function computeHealthScore(
  criticalCount: number,
  importantCount: number,
  cosmeticCount: number,
  totalRecords: number,
): number {
  if (totalRecords === 0) return 100;
  const weighted =
    criticalCount * HEALTH_WEIGHTS.critical +
    importantCount * HEALTH_WEIGHTS.important +
    cosmeticCount * HEALTH_WEIGHTS.cosmetic;
  return Math.max(0, Math.round(100 - (weighted / totalRecords) * HEALTH_WEIGHTS.multiplier));
}

function n(status: string | null | undefined) {
  return String(status || "").toLowerCase();
}

export function isClosedOpportunity(status: string | null | undefined) {
  const s = n(status);
  return (
    s.includes("won") ||
    s.includes("lost") ||
    s.includes("cancel") ||
    s.includes("declined")
  );
}

export function isCompleteWork(status: string | null | undefined) {
  const s = n(status);
  return s.includes("complete") || s.includes("done") || s.includes("finished");
}

export function isCancelledWork(status: string | null | undefined) {
  return n(status).includes("cancel");
}

export function isRecentActiveWork(
  status: string | null | undefined,
  startDate: string | null | undefined,
): boolean {
  if (isCompleteWork(status) || isCancelledWork(status)) {
    return false;
  }

  if (!startDate) {
    return true;
  }

  const parsed = new Date(startDate);
  if (Number.isNaN(parsed.getTime())) {
    return true;
  }

  const cutoffMs = Date.now() - 180 * 24 * 60 * 60 * 1000;
  return parsed.getTime() >= cutoffMs;
}

export function isUnpaid(status: string | null | undefined) {
  const s = n(status);
  return (
    s.includes("unpaid") ||
    s.includes("partial") ||
    s.includes("due") ||
    s.includes("overdue")
  );
}

export function isOpenFollowUp(status: string | null | undefined) {
  const s = n(status);
  return !(s.includes("complete") || s.includes("done") || s.includes("closed"));
}

export function getOpportunityTone(status: string | null | undefined): Tone {
  const s = n(status);
  if (s.includes("won") || s.includes("accepted")) return "success";
  if (s.includes("lost") || s.includes("cancel") || s.includes("declined"))
    return "danger";
  if (
    s.includes("new") ||
    s.includes("open") ||
    s.includes("contact") ||
    s.includes("estimate") ||
    s.includes("follow")
  )
    return "warning";
  return "neutral";
}

export function getWorkTone(status: string | null | undefined): Tone {
  const s = n(status);
  if (s.includes("complete") || s.includes("done") || s.includes("paid"))
    return "success";
  if (s.includes("cancel") || s.includes("failed") || s.includes("overdue"))
    return "danger";
  if (
    s.includes("scheduled") ||
    s.includes("active") ||
    s.includes("progress") ||
    s.includes("unpaid") ||
    s.includes("partial") ||
    s.includes("pending")
  )
    return "warning";
  return "neutral";
}

export function getRevenueTone(status: string | null | undefined): Tone {
  const s = n(status);
  if (s.includes("paid") && !s.includes("unpaid")) return "success";
  if (
    s.includes("unpaid") ||
    s.includes("partial") ||
    s.includes("due") ||
    s.includes("overdue")
  )
    return "danger";
  if (s.includes("pending")) return "warning";
  return "neutral";
}

export function getActionTone(status: string | null | undefined): Tone {
  const s = n(status);
  if (s.includes("complete") || s.includes("done") || s.includes("closed"))
    return "success";
  if (s.includes("overdue") || s.includes("blocked") || s.includes("failed"))
    return "danger";
  if (
    s.includes("open") ||
    s.includes("pending") ||
    s.includes("todo") ||
    s.includes("follow")
  )
    return "warning";
  return "neutral";
}

export function getGenericTone(status: string | null | undefined): Tone {
  const s = n(status);
  if (
    s.includes("complete") ||
    s.includes("done") ||
    s.includes("paid") ||
    s.includes("won") ||
    s.includes("active") ||
    s.includes("connected")
  )
    return "success";
  if (
    s.includes("lost") ||
    s.includes("cancel") ||
    s.includes("failed") ||
    s.includes("overdue") ||
    s.includes("unpaid") ||
    s.includes("partial") ||
    s.includes("error") ||
    s.includes("expired")
  )
    return "danger";
  if (
    s.includes("new") ||
    s.includes("open") ||
    s.includes("pending") ||
    s.includes("follow") ||
    s.includes("estimate") ||
    s.includes("active") ||
    s.includes("progress") ||
    s.includes("scheduled")
  )
    return "warning";
  return "neutral";
}
