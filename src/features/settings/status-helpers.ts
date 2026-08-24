export function titleCase(value: string | null) {
  const text = String(value || "")
    .replace(/_/g, " ")
    .trim();

  if (!text) {
    return "";
  }

  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getStatusTone(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("active") || normalized.includes("connected")) {
    return "success" as const;
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("expired")
  ) {
    return "danger" as const;
  }

  if (normalized.includes("pending")) {
    return "warning" as const;
  }

  return "neutral" as const;
}

export function getStatusLabel(status: string | null) {
  return titleCase(status) || "Not connected";
}
