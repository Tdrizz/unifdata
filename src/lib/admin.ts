// Single source of truth for the app's admin allowlist. Two different
// conventions existed before this: ai-health/page.tsx checked the
// single-value ADMIN_EMAIL, while waitlist/approve/route.ts already
// supported a comma-separated ADMIN_EMAILS (falling back to ADMIN_EMAIL) --
// meaning an admin added to one wouldn't necessarily be recognized by the
// other. Every admin-gate check and admin-email lookup should go through
// the helpers below instead of reading the env vars directly.

function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return parseAdminEmails().some((e) => e.toLowerCase() === normalized);
}

// For the one caller that needs an actual address to send to (the waitlist
// notification email), not a yes/no gate check.
export function getPrimaryAdminEmail(): string | null {
  return parseAdminEmails()[0] ?? null;
}
