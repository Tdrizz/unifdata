// Sectors that may handle PHI — AI features disabled without BAAs in place
const PHI_SECTORS = new Set(["medical"]);

// Tiers are collapsed: every subscribed company gets Aria and the full agent
// pipeline — matching the "everything included, no tiers" pricing. This function
// is kept as the single seam for re-gating: to deliberately re-introduce a paid
// tier later, restore the `company.tier === "pro"` check here (and the cron
// company filters) rather than re-scattering gates across the codebase.
export function isPro(_company: { tier: string }): boolean {
  return true;
}

export function isAutopilot(company: {
  preferences?: Record<string, unknown>;
}): boolean {
  return company.preferences?.autopilot === true;
}

export function isAiAllowed(company: {
  business_sector?: string | null;
}): boolean {
  return !PHI_SECTORS.has(company.business_sector ?? "");
}
