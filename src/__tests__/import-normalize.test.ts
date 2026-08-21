/**
 * Pure import identity/coercion helpers. These feed the external_id / external_hash
 * dedup keys, so their determinism is the import dedup contract.
 */
import { describe, it, expect } from "vitest";
import {
  hashImportData,
  buildExternalId,
  toImportNumber,
  toImportDate,
  cleanImportValue,
} from "@/lib/import-engine";

describe("hashImportData", () => {
  it("is deterministic for identical input", () => {
    expect(hashImportData({ a: 1, b: "x" })).toBe(hashImportData({ a: 1, b: "x" }));
  });

  it("differs when the data differs", () => {
    expect(hashImportData({ a: 1 })).not.toBe(hashImportData({ a: 2 }));
  });

  it("returns a 64-char hex sha256 digest", () => {
    expect(hashImportData({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("buildExternalId", () => {
  it("returns the provided external id verbatim when present", () => {
    expect(
      buildExternalId({ sourceType: "csv" as never, sourceName: "f", rowNumber: 3, providedExternalId: "ext-9" }),
    ).toBe("ext-9");
  });

  it("builds a stable synthetic id from source + row when none is provided", () => {
    const id = buildExternalId({ sourceType: "csv" as never, sourceName: "leads.csv", rowNumber: 7 });
    expect(id).toBe("csv:leads.csv:row_7");
  });

  it("falls back to 'unknown' when the source name is missing", () => {
    expect(buildExternalId({ sourceType: "csv" as never, sourceName: null, rowNumber: 1 })).toBe("csv:unknown:row_1");
  });
});

describe("toImportNumber", () => {
  it("strips currency formatting", () => {
    expect(toImportNumber("$1,234.50")).toBe(1234.5);
  });
  it("returns null for empty and non-numeric input", () => {
    expect(toImportNumber("")).toBeNull();
    expect(toImportNumber("abc")).toBeNull();
  });
});

describe("toImportDate", () => {
  it("passes through ISO dates", () => {
    expect(toImportDate("2024-01-15")).toBe("2024-01-15");
  });
  it("converts a Google Sheets serial number to a real date", () => {
    // 46162 is a plausible modern serial; result must be a YYYY-MM-DD in a sane year.
    const d = toImportDate("46162");
    expect(d).toMatch(/^20\d\d-\d\d-\d\d$/);
  });
  it("returns null for empty or unparseable input", () => {
    expect(toImportDate("")).toBeNull();
    expect(toImportDate("not-a-date")).toBeNull();
  });
});

describe("cleanImportValue", () => {
  it("trims and stringifies, coercing nullish to empty string", () => {
    expect(cleanImportValue("  hi  ")).toBe("hi");
    expect(cleanImportValue(null)).toBe("");
    expect(cleanImportValue(42)).toBe("42");
  });
});
