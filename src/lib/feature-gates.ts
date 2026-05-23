// Sectors that may handle PHI — AI features disabled without BAAs in place
const PHI_SECTORS = new Set(["medical"]);

export function isPro(company: { tier: string }): boolean {
  return company.tier === "pro";
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
