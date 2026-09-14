/**
 * Integration syncs stage rows carrying the provider's own record ID, but
 * createImportSessionFromRows called buildExternalId without passing it, so
 * external_record_links stored a synthetic "quickbooks:quickbooks-invoices:row_7"
 * instead. filterFreshRows looks those links up *by provider ID*, so it never
 * matched anything and every sync re-staged every invoice from scratch.
 *
 * That was survivable while staged rows sat waiting for manual review. Now that
 * a connected integration imports straight through, it would mean duplicate
 * revenue on every single sync -- so these lock the ID plumbing down.
 */
import { describe, it, expect } from "vitest";
import { buildExternalId } from "@/lib/import-engine";

describe("buildExternalId", () => {
  it("uses the provider's own record ID when the row carries one", () => {
    expect(
      buildExternalId({
        sourceType: "quickbooks",
        sourceName: "quickbooks-invoices",
        rowNumber: 7,
        providedExternalId: "1042",
      }),
    ).toBe("1042");
  });

  it("is stable across syncs even when the row lands in a different position", () => {
    const first = buildExternalId({
      sourceType: "quickbooks",
      sourceName: "quickbooks-invoices",
      rowNumber: 7,
      providedExternalId: "1042",
    });
    const second = buildExternalId({
      sourceType: "quickbooks",
      sourceName: "quickbooks-invoices",
      rowNumber: 2,
      providedExternalId: "1042",
    });
    expect(first).toBe(second);
  });

  it("falls back to a synthetic ID for CSV rows, which have no provider ID", () => {
    expect(
      buildExternalId({
        sourceType: "csv",
        sourceName: "customers.csv",
        rowNumber: 7,
      }),
    ).toBe("csv:customers.csv:row_7");
  });

  it("ignores an empty provided ID rather than writing a blank link", () => {
    expect(
      buildExternalId({
        sourceType: "csv",
        sourceName: "customers.csv",
        rowNumber: 3,
        providedExternalId: "",
      }),
    ).toBe("csv:customers.csv:row_3");
  });

  it("names the source 'unknown' when there is nothing to name it after", () => {
    expect(buildExternalId({ sourceType: "csv", rowNumber: 1 })).toBe("csv:unknown:row_1");
  });
});
