// Shared normalisation helpers for the import pipeline.
// Extends the thin normalizers in src/lib/normalize.ts with date and amount support.

export function normalizePhone(value: unknown): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;

  const digits = s.replace(/\D/g, "");
  const normalized =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (normalized.length < 7 || normalized.length > 15) return null;
  return normalized;
}

export function normalizeEmail(value: unknown): string | null {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!s || !s.includes("@")) return null;
  return s;
}

export function normalizeName(value: unknown): string | null {
  const s = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  return s || null;
}

// Returns ISO date string YYYY-MM-DD or null.
export function normalizeDate(value: unknown): string | null {
  if (!value) return null;

  const s = String(value).trim();
  if (!s) return null;

  // Already ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // XLSX serial date (number)
  const numeric = Number(s);
  if (!isNaN(numeric) && numeric > 0 && numeric < 100000) {
    // Excel date serial: days since 1899-12-30
    const d = new Date((numeric - 25569) * 86400000);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  // Common US date patterns: M/D/YYYY, MM/DD/YYYY, M-D-YYYY
  const usDate = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (usDate) {
    const [, m, d, y] = usDate;
    const year = y.length === 2 ? (Number(y) > 50 ? `19${y}` : `20${y}`) : y;
    const month = m.padStart(2, "0");
    const day = d.padStart(2, "0");
    const iso = `${year}-${month}-${day}`;
    if (!isNaN(Date.parse(iso))) return iso;
  }

  // Fallback: try native Date parse (handles "Jan 5, 2024" etc.)
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return null;
}

// Returns a positive number or null.
export function normalizeAmount(value: unknown): number | null {
  if (!value && value !== 0) return null;

  const s = String(value)
    .trim()
    .replace(/[$,€£¥\s]/g, "")
    .replace(/\(([^)]+)\)/, "-$1"); // (123.00) → -123.00

  if (!s) return null;

  const n = Number(s);
  return isFinite(n) ? n : null;
}

const PAID_PATTERNS = /^(paid|complete|completed|yes|y|true|1|cleared|settled|done)$/i;
const UNPAID_PATTERNS =
  /^(unpaid|outstanding|pending|open|no|n|false|0|due|overdue|owed)$/i;

export function normalizePaymentStatus(
  value: unknown,
): "paid" | "unpaid" | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (PAID_PATTERNS.test(s)) return "paid";
  if (UNPAID_PATTERNS.test(s)) return "unpaid";
  return null;
}
