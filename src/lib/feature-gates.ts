export function isPro(company: { tier: string }): boolean {
  return company.tier === "pro";
}

export function isAutopilot(company: {
  preferences?: Record<string, unknown>;
}): boolean {
  return company.preferences?.autopilot === true;
}
