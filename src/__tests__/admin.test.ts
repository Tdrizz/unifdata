/**
 * Two different admin-gate conventions existed before this: ai-health/page.tsx
 * checked the single-value ADMIN_EMAIL, while waitlist/approve/route.ts already
 * supported a comma-separated ADMIN_EMAILS with an ADMIN_EMAIL fallback -- so
 * an admin added to one env var wasn't necessarily recognized by both gates.
 * isAdminEmail/getPrimaryAdminEmail are now the single source of truth both
 * (and the waitlist notification email) go through.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAdminEmail, getPrimaryAdminEmail } from "@/lib/admin";

const ORIGINAL_EMAIL = process.env.ADMIN_EMAIL;
const ORIGINAL_EMAILS = process.env.ADMIN_EMAILS;

function setEnv(emails: string | undefined, email: string | undefined) {
  if (emails === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = emails;
  if (email === undefined) delete process.env.ADMIN_EMAIL;
  else process.env.ADMIN_EMAIL = email;
}

afterEach(() => {
  setEnv(ORIGINAL_EMAILS, ORIGINAL_EMAIL);
});

describe("isAdminEmail", () => {
  beforeEach(() => setEnv(undefined, undefined));

  it("matches a single-value ADMIN_EMAIL (legacy convention)", () => {
    setEnv(undefined, "owner@example.com");
    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("someone-else@example.com")).toBe(false);
  });

  it("matches any address in a comma-separated ADMIN_EMAILS", () => {
    setEnv("owner@example.com, teammate@example.com", undefined);
    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("teammate@example.com")).toBe(true);
    expect(isAdminEmail("someone-else@example.com")).toBe(false);
  });

  it("prefers ADMIN_EMAILS over ADMIN_EMAIL when both are set", () => {
    setEnv("new-admin@example.com", "old-admin@example.com");
    expect(isAdminEmail("new-admin@example.com")).toBe(true);
    expect(isAdminEmail("old-admin@example.com")).toBe(false);
  });

  it("is case-insensitive", () => {
    setEnv("Owner@Example.com", undefined);
    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("OWNER@EXAMPLE.COM")).toBe(true);
  });

  it("is false for null/undefined/empty input or no admin emails configured", () => {
    setEnv(undefined, undefined);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail("anyone@example.com")).toBe(false);
  });
});

describe("getPrimaryAdminEmail", () => {
  it("returns the first configured admin email", () => {
    setEnv("first@example.com, second@example.com", undefined);
    expect(getPrimaryAdminEmail()).toBe("first@example.com");
  });

  it("returns null when nothing is configured", () => {
    setEnv(undefined, undefined);
    expect(getPrimaryAdminEmail()).toBeNull();
  });
});
