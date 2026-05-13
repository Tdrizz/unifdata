export function normalizePhone(value: unknown): string | null {
  const s = String(value ?? "").trim();

  if (!s) {
    return null;
  }

  const digits = s.replace(/\D/g, "");

  // Strip leading country code 1 for North American numbers
  const normalized =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  // Valid phone: 7–15 digits
  if (normalized.length < 7 || normalized.length > 15) {
    return null;
  }

  return normalized;
}

export function normalizeEmail(value: unknown): string | null {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!s || !s.includes("@")) {
    return null;
  }

  return s;
}

export function normalizeName(value: unknown): string | null {
  const s = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

  return s || null;
}
