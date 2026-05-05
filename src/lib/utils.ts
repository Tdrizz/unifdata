export function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim();
}

export function getOptionalNumber(formData: FormData, key: string) {
  const value = getFormString(formData, key);
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function getDateInputValue(date: string | null | undefined) {
  if (!date) return "";
  return date.includes("T") ? date.slice(0, 10) : date;
}

export function compactText(
  value: string | null | undefined,
  fallback = "Not set",
) {
  return String(value || "").trim() || fallback;
}
