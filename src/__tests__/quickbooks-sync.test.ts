/**
 * Every QuickBooks contact imported as "Unnamed" because the sync wrote
 * first_name/last_name straight from GivenName/FamilyName. QuickBooks only
 * populates those when a customer is entered as a structured person; enter a
 * customer as one name -- which is what most small businesses do, companies
 * included -- and both come back empty.
 *
 * qbDisplayName is the single place that decision now lives, and it deliberately
 * prefers DisplayName because that's the string QuickBooks stamps on invoices as
 * CustomerRef.name, which is how imported sales find their contact again.
 */
import { describe, it, expect } from "vitest";
import { qbDisplayName } from "@/lib/integrations/quickbooks";
import { splitName } from "@/lib/crm/legacy-shape";

describe("qbDisplayName", () => {
  it("prefers DisplayName, because invoices reference customers by it", () => {
    expect(
      qbDisplayName({ DisplayName: "Smith, John", GivenName: "John", FamilyName: "Smith" }),
    ).toBe("Smith, John");
  });

  it("falls back to GivenName + FamilyName when there is no DisplayName", () => {
    expect(qbDisplayName({ GivenName: "John", FamilyName: "Smith" })).toBe("John Smith");
  });

  it("uses only the half of the structured name that is present", () => {
    expect(qbDisplayName({ GivenName: "John" })).toBe("John");
    expect(qbDisplayName({ FamilyName: "Smith" })).toBe("Smith");
  });

  it("falls back to CompanyName when no personal name exists at all", () => {
    expect(qbDisplayName({ CompanyName: "Acme Plumbing LLC" })).toBe("Acme Plumbing LLC");
  });

  it("treats a whitespace-only DisplayName as absent", () => {
    expect(qbDisplayName({ DisplayName: "   ", CompanyName: "Acme Plumbing LLC" })).toBe(
      "Acme Plumbing LLC",
    );
  });

  it("returns an empty string when QuickBooks sends no name of any kind", () => {
    expect(qbDisplayName({})).toBe("");
  });
});

describe("name written to master_customers", () => {
  // The payload coerces "" to null, since splitName returns an empty first_name
  // for empty input and a blank string in the column reads as a real name.
  function toPayloadName(c: Parameters<typeof qbDisplayName>[0]) {
    const { first_name, last_name } = splitName(qbDisplayName(c));
    return { first_name: first_name || null, last_name };
  }

  it("keeps a company entered as a single field intact and searchable", () => {
    expect(toPayloadName({ DisplayName: "Acme Plumbing LLC" })).toEqual({
      first_name: "Acme",
      last_name: "Plumbing LLC",
    });
  });

  it("handles a one-word name without inventing a last name", () => {
    expect(toPayloadName({ DisplayName: "Dave" })).toEqual({
      first_name: "Dave",
      last_name: null,
    });
  });

  it("never writes an empty-string first_name", () => {
    expect(toPayloadName({}).first_name).toBeNull();
  });

  it("regression: a customer with only a DisplayName is no longer nameless", () => {
    // This is the exact shape that produced "Unnamed" -- GivenName and
    // FamilyName absent, everything in DisplayName.
    const payload = toPayloadName({ DisplayName: "Rivera Landscaping" });
    expect(payload.first_name).not.toBeNull();
    expect([payload.first_name, payload.last_name].filter(Boolean).join(" ")).toBe(
      "Rivera Landscaping",
    );
  });
});
