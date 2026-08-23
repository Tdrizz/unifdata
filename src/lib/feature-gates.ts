export function isAutopilot(company: {
  preferences?: Record<string, unknown>;
}): boolean {
  return company.preferences?.autopilot === true;
}

// No supported industry currently handles PHI (medical/healthcare sectors
// were dropped — see industry-profiles.ts), so AI features are unconditionally
// available. Kept as a function, not inlined at call sites, so a future PHI
// sector can reintroduce gating here without touching callers.
export function isAiAllowed(_company: {
  business_sector?: string | null;
}): boolean {
  return true;
}
