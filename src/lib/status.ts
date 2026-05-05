type Tone = "success" | "warning" | "danger" | "neutral";

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
