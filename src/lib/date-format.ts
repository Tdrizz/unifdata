export function parseDateOnly(date: string | null | undefined) {
  if (!date) {
    return null;
  }

  const datePart = date.includes("T") ? date.slice(0, 10) : date;
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const value = new Date(year, month - 1, day);
  value.setHours(0, 0, 0, 0);

  return value;
}

export function formatDateOnly(date: string | null | undefined) {
  const value = parseDateOnly(date);

  if (!value) {
    return "—";
  }

  return value.toLocaleDateString();
}

export function formatTimestampDate(date: string | null | undefined) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
}

export function getTodayDateOnly() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

export function isTodayOrPast(date: string | null | undefined) {
  const value = parseDateOnly(date);
  if (!value) return false;
  return value <= getTodayDateOnly();
}

export function isOverdue(date: string | null | undefined) {
  const value = parseDateOnly(date);
  if (!value) return false;
  return value < getTodayDateOnly();
}

export function isDueToday(date: string | null | undefined) {
  const value = parseDateOnly(date);
  if (!value) return false;
  return value.getTime() === getTodayDateOnly().getTime();
}

export function isUpcoming(date: string | null | undefined) {
  const value = parseDateOnly(date);
  if (!value) return false;
  return value > getTodayDateOnly();
}
