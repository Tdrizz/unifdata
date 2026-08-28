/**
 * Phase 03 create-time duplicate check — pure matching logic only (the
 * DB-touching findDuplicateContact isn't covered here, matching this
 * codebase's existing convention of not unit-testing thin Supabase-calling
 * wrappers in src/lib/crm/contacts.ts).
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildDuplicateContactFilter, matchedDuplicateField } from "@/lib/crm/contacts";

describe("buildDuplicateContactFilter", () => {
  it("returns null when neither input is a complete email or phone", () => {
    expect(buildDuplicateContactFilter("", "")).toBeNull();
    expect(buildDuplicateContactFilter("not-an-email", "12345")).toBeNull();
  });

  it("builds an email-only filter once the email looks complete", () => {
    const filter = buildDuplicateContactFilter("Jane@Example.com", "");
    expect(filter).toBe("primary_email.ilike.jane@example.com");
  });

  it("matches both the digits-normalized and as-typed phone, since the two contact-creation paths store phone differently", () => {
    const filter = buildDuplicateContactFilter(null, "(808) 555-1234");
    // sanitizeSearchTerm strips ()," from the raw value before it's placed in
    // the filter string, so the as-typed arm loses its parens but keeps the
    // rest of the punctuation verbatim.
    expect(filter).toBe("primary_phone.eq.8085551234,primary_phone.eq.808  555-1234");
  });

  it("doesn't duplicate the phone filter when the raw input is already digits-only", () => {
    const filter = buildDuplicateContactFilter(null, "8085551234");
    expect(filter).toBe("primary_phone.eq.8085551234");
  });

  it("combines email and phone filters with a comma for .or()", () => {
    const filter = buildDuplicateContactFilter("jane@example.com", "8085551234");
    expect(filter).toBe(
      "primary_email.ilike.jane@example.com,primary_phone.eq.8085551234",
    );
  });
});

describe("matchedDuplicateField", () => {
  it("reports 'email' when the match's email normalizes to the same value as the input", () => {
    expect(
      matchedDuplicateField({ primary_email: "Jane@Example.com" }, "jane@example.com"),
    ).toBe("email");
  });

  it("falls back to 'phone' when there's no email match", () => {
    expect(matchedDuplicateField({ primary_email: null }, null)).toBe("phone");
    expect(
      matchedDuplicateField({ primary_email: "someone-else@example.com" }, "jane@example.com"),
    ).toBe("phone");
  });
});
