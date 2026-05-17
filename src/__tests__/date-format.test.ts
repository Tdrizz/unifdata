import { describe, it, expect } from "vitest";
import {
  parseDateOnly,
  formatDateOnly,
  isTodayOrPast,
  isOverdue,
  isDueToday,
  isUpcoming,
  getTodayString,
} from "@/lib/date-format";

describe("parseDateOnly", () => {
  it("returns null for null input", () => {
    expect(parseDateOnly(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseDateOnly("")).toBeNull();
  });

  it("returns null for invalid date string", () => {
    expect(parseDateOnly("not-a-date")).toBeNull();
  });

  it("parses a YYYY-MM-DD string to midnight local time", () => {
    const result = parseDateOnly("2025-06-15");
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getMonth()).toBe(5); // June = 5
    expect(result!.getDate()).toBe(15);
    expect(result!.getHours()).toBe(0);
    expect(result!.getMinutes()).toBe(0);
  });

  it("strips the time portion from an ISO timestamp", () => {
    const result = parseDateOnly("2025-01-20T14:30:00Z");
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getMonth()).toBe(0); // January = 0
    expect(result!.getDate()).toBe(20);
  });
});

describe("formatDateOnly", () => {
  it("returns em-dash for null", () => {
    expect(formatDateOnly(null)).toBe("—");
  });

  it("returns em-dash for empty string", () => {
    expect(formatDateOnly("")).toBe("—");
  });

  it("returns a non-empty string for a valid date", () => {
    const result = formatDateOnly("2025-03-10");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe("—");
  });
});

describe("getTodayString", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    const result = getTodayString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("date comparison helpers", () => {
  it("isOverdue returns true for a date in the distant past", () => {
    expect(isOverdue("2000-01-01")).toBe(true);
  });

  it("isOverdue returns false for a date in the distant future", () => {
    expect(isOverdue("2099-12-31")).toBe(false);
  });

  it("isOverdue returns false for null", () => {
    expect(isOverdue(null)).toBe(false);
  });

  it("isUpcoming returns true for a date in the distant future", () => {
    expect(isUpcoming("2099-12-31")).toBe(true);
  });

  it("isUpcoming returns false for a date in the distant past", () => {
    expect(isUpcoming("2000-01-01")).toBe(false);
  });

  it("isUpcoming returns false for null", () => {
    expect(isUpcoming(null)).toBe(false);
  });

  it("isTodayOrPast returns true for a past date", () => {
    expect(isTodayOrPast("2000-01-01")).toBe(true);
  });

  it("isTodayOrPast returns false for a future date", () => {
    expect(isTodayOrPast("2099-12-31")).toBe(false);
  });

  it("isDueToday returns false for past and future dates", () => {
    expect(isDueToday("2000-01-01")).toBe(false);
    expect(isDueToday("2099-12-31")).toBe(false);
  });

  it("isDueToday returns true for today's local date string", () => {
    const d = new Date();
    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(isDueToday(localToday)).toBe(true);
  });
});
