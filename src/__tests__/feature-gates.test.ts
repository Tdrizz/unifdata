import { describe, it, expect } from "vitest";
import { isDataFixAutopilot, isOutreachAutopilot } from "@/lib/feature-gates";

describe("isDataFixAutopilot", () => {
  it("defaults to true when no preference is set", () => {
    expect(isDataFixAutopilot({})).toBe(true);
    expect(isDataFixAutopilot({ preferences: {} })).toBe(true);
  });

  it("stays true when explicitly enabled", () => {
    expect(isDataFixAutopilot({ preferences: { autopilot_data_fixes: true } })).toBe(true);
  });

  it("is false only when explicitly disabled", () => {
    expect(isDataFixAutopilot({ preferences: { autopilot_data_fixes: false } })).toBe(false);
  });

  it("ignores the legacy combined autopilot key", () => {
    expect(isDataFixAutopilot({ preferences: { autopilot: false } })).toBe(true);
  });
});

describe("isOutreachAutopilot", () => {
  it("defaults to false when no preference is set", () => {
    expect(isOutreachAutopilot({})).toBe(false);
    expect(isOutreachAutopilot({ preferences: {} })).toBe(false);
  });

  it("respects the new key when explicitly set", () => {
    expect(isOutreachAutopilot({ preferences: { autopilot_outreach: true } })).toBe(true);
    expect(isOutreachAutopilot({ preferences: { autopilot_outreach: false } })).toBe(false);
  });

  it("falls back to the legacy combined autopilot key for workspaces that set it before the split", () => {
    expect(isOutreachAutopilot({ preferences: { autopilot: true } })).toBe(true);
    expect(isOutreachAutopilot({ preferences: { autopilot: false } })).toBe(false);
  });

  it("prefers the explicit new key over the legacy one", () => {
    expect(isOutreachAutopilot({ preferences: { autopilot: true, autopilot_outreach: false } })).toBe(false);
    expect(isOutreachAutopilot({ preferences: { autopilot: false, autopilot_outreach: true } })).toBe(true);
  });
});
