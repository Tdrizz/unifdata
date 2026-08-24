// Outreach autopilot: sends real emails/SMS to customers with no review.
// Customer-facing and hard to take back once sent, so it stays opt-in —
// defaults to off unless a workspace explicitly turns it on. Reads the
// legacy `autopilot` key too, since that used to control both this and
// data-fix autopilot together before they were split.
export function isOutreachAutopilot(company: {
  preferences?: Record<string, unknown>;
}): boolean {
  const prefs = company.preferences;
  if (prefs?.autopilot_outreach === true) return true;
  if (prefs?.autopilot_outreach === false) return false;
  return prefs?.autopilot === true;
}

// Data-fix autopilot: auto-applies routine data quality fixes (merging
// obvious duplicates, dismissing clearly-junk records) that only touch the
// workspace's own records — nothing customer-facing, nothing that can't be
// undone by re-splitting a merge later. Defaults ON: this is the "quietly
// keep the data clean" behavior the assistant should do without being asked,
// as opposed to outreach autopilot's "act on the outside world" behavior.
export function isDataFixAutopilot(company: {
  preferences?: Record<string, unknown>;
}): boolean {
  return company.preferences?.autopilot_data_fixes !== false;
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
