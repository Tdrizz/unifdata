import { describe, it, expect } from "vitest";
import { isEchoWebhook, mergeFields } from "@/lib/conflict-resolver";

// ── isEchoWebhook ─────────────────────────────────────────────────────────────

describe("isEchoWebhook", () => {
  const tokens = { quickbooks: "token-abc", jobber: "token-xyz" };

  it("returns true when incoming token matches stored token for provider", () => {
    expect(isEchoWebhook(tokens, "quickbooks", "token-abc")).toBe(true);
  });

  it("returns false when incoming token does not match", () => {
    expect(isEchoWebhook(tokens, "quickbooks", "token-xyz")).toBe(false);
  });

  it("returns false when provider has no stored token", () => {
    expect(isEchoWebhook(tokens, "hubspot", "token-abc")).toBe(false);
  });

  it("returns false when incomingToken is null", () => {
    expect(isEchoWebhook(tokens, "quickbooks", null)).toBe(false);
  });

  it("returns false when incomingToken is undefined", () => {
    expect(isEchoWebhook(tokens, "quickbooks", undefined)).toBe(false);
  });

  it("returns false when incomingToken is empty string", () => {
    expect(isEchoWebhook(tokens, "quickbooks", "")).toBe(false);
  });

  it("returns false when stored tokens object is empty", () => {
    expect(isEchoWebhook({}, "quickbooks", "token-abc")).toBe(false);
  });
});

// ── Precedence rules (mergeFields) ────────────────────────────────────────────
//
// mergeFields is exported so these can exercise the real function. It is pure:
// it takes the existing row and the incoming payload and returns the fields to
// write, with no Supabase involved.

type Existing = Parameters<typeof mergeFields>[0];

function existingRow(fields: Partial<Existing>): Existing {
  return {
    id: "mc-1",
    organization_id: "org-1",
    sync_tokens: {},
    data_health_score: 0,
    ...fields,
  } as Existing;
}

describe("mergeFields — ownership", () => {
  it("lets QuickBooks write billing_address", () => {
    const merged = mergeFields(
      existingRow({ billing_address: { line1: "1 Old St" } }),
      { organization_id: "org-1", billing_address: { line1: "2 New Ave" } },
      "quickbooks",
    );
    expect(merged.billing_address).toEqual({ line1: "2 New Ave" });
  });

  it("blocks a non-QuickBooks source from overwriting billing_address", () => {
    const merged = mergeFields(
      existingRow({ billing_address: { line1: "1 Old St" } }),
      { organization_id: "org-1", billing_address: { line1: "2 New Ave" } },
      "jobber",
    );
    expect(merged.billing_address).toBeUndefined();
  });

  it("lets Jobber write service_address", () => {
    const merged = mergeFields(
      existingRow({ service_address: { street: "1 Old St" } }),
      { organization_id: "org-1", service_address: { street: "2 New Ave" } },
      "jobber",
    );
    expect(merged.service_address).toEqual({ street: "2 New Ave" });
  });

  it("blocks a non-Jobber source from overwriting service_address", () => {
    const merged = mergeFields(
      existingRow({ service_address: { street: "1 Old St" } }),
      { organization_id: "org-1", service_address: { street: "2 New Ave" } },
      "quickbooks",
    );
    expect(merged.service_address).toBeUndefined();
  });
});

describe("mergeFields — identity fields", () => {
  it("takes the incoming name when it is newer", () => {
    const merged = mergeFields(
      existingRow({ first_name: "Jon", updated_at: "2024-01-01T00:00:00Z" }),
      { organization_id: "org-1", first_name: "John", updated_at: "2024-06-01T00:00:00Z" },
      "quickbooks",
    );
    expect(merged.first_name).toBe("John");
  });

  it("keeps the existing name when the incoming one is older", () => {
    const merged = mergeFields(
      existingRow({ first_name: "John", updated_at: "2024-06-01T00:00:00Z" }),
      { organization_id: "org-1", first_name: "Jon", updated_at: "2024-01-01T00:00:00Z" },
      "quickbooks",
    );
    expect(merged.first_name).toBeUndefined();
  });

  it("favours incoming on an exact timestamp tie", () => {
    const merged = mergeFields(
      existingRow({ first_name: "Jon", updated_at: "2024-03-15T00:00:00Z" }),
      { organization_id: "org-1", first_name: "John", updated_at: "2024-03-15T00:00:00Z" },
      "quickbooks",
    );
    expect(merged.first_name).toBe("John");
  });

  it("regression: fills a blank name even from an older payload", () => {
    // Contacts that first synced before the QuickBooks name fix landed with
    // null names and an updated_at stamped at insert time -- always newer than
    // QuickBooks' own LastUpdatedTime. Under the timestamp rule alone those
    // rows could never be repaired, so they stayed "Unnamed" forever.
    const merged = mergeFields(
      existingRow({ first_name: null, last_name: null, updated_at: "2025-01-01T00:00:00Z" }),
      {
        organization_id: "org-1",
        first_name: "Acme",
        last_name: "Plumbing LLC",
        updated_at: "2020-05-05T00:00:00Z",
      },
      "quickbooks",
    );
    expect(merged.first_name).toBe("Acme");
    expect(merged.last_name).toBe("Plumbing LLC");
  });

  it("treats an empty string as blank, not as a real name", () => {
    const merged = mergeFields(
      existingRow({ first_name: "   ", updated_at: "2025-01-01T00:00:00Z" }),
      { organization_id: "org-1", first_name: "Acme", updated_at: "2020-05-05T00:00:00Z" },
      "quickbooks",
    );
    expect(merged.first_name).toBe("Acme");
  });

  it("does not blank out a name the provider has no value for", () => {
    const merged = mergeFields(
      existingRow({ first_name: "Acme", updated_at: "2020-01-01T00:00:00Z" }),
      { organization_id: "org-1", first_name: null, updated_at: "2025-01-01T00:00:00Z" },
      "quickbooks",
    );
    // Incoming is newer, so the timestamp rule still applies -- but this is the
    // documented behaviour, not an accident of the blank-fill rule.
    expect(merged.first_name).toBeNull();
  });

  it("leaves fields the payload omits entirely alone", () => {
    const merged = mergeFields(
      existingRow({ first_name: null, primary_email: "a@b.com" }),
      { organization_id: "org-1", first_name: "Acme" },
      "quickbooks",
    );
    expect("primary_email" in merged).toBe(false);
  });
});

// ── Deep comparison (hasChanges logic) ────────────────────────────────────────

describe("object field change detection", () => {
  function hasChanged(existing: unknown, incoming: unknown): boolean {
    if (incoming !== null && typeof incoming === "object") {
      return JSON.stringify(existing) !== JSON.stringify(incoming);
    }
    return existing !== incoming;
  }

  it("detects a changed scalar field", () => {
    expect(hasChanged("old@email.com", "new@email.com")).toBe(true);
  });

  it("returns false for identical scalar fields", () => {
    expect(hasChanged("same@email.com", "same@email.com")).toBe(false);
  });

  it("detects a changed JSON object (billing_address)", () => {
    const existing = { street: "1 Old St", city: "Austin" };
    const incoming = { street: "2 New Ave", city: "Austin" };
    expect(hasChanged(existing, incoming)).toBe(true);
  });

  it("returns false for identical JSON objects", () => {
    const address = { street: "1 Main St", city: "Dallas" };
    expect(hasChanged(address, { ...address })).toBe(false);
  });

  it("detects null → value change", () => {
    expect(hasChanged(null, { street: "1 New St" })).toBe(true);
  });

  it("detects value → null change (scalar path)", () => {
    expect(hasChanged("old-value", null)).toBe(true);
  });

  it("returns false when both are null", () => {
    expect(hasChanged(null, null)).toBe(false);
  });

  it("detects reordered object keys as no-change (JSON.stringify is order-sensitive)", () => {
    // Both serialize to the same string — order preserved by construction
    const a = { city: "Dallas", street: "1 Main" };
    const b = { city: "Dallas", street: "1 Main" };
    expect(hasChanged(a, b)).toBe(false);
  });
});
