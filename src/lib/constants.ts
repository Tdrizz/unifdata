export const OPPORTUNITY_STATUSES = [
  "New",
  "Contacted",
  "Estimate Sent",
  "Follow Up",
  "Won",
  "Lost",
] as const;

export const GEMINI_MODEL =
  process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export const DATA_LIMITS = {
  BUSINESS_SUMMARY: 750,
  CHAT_CONTEXT: 200,
} as const;

// Booking link for the "Book a free demo" CTA. Set NEXT_PUBLIC_DEMO_FORM_URL in
// the environment (e.g. Vercel) to point it at the real form — no code change
// needed. Until it is set, the CTAs fall back to the /waitlist page (a real,
// existing route) rather than a dead placeholder that 404s.
export const DEMO_FORM_URL =
  process.env.NEXT_PUBLIC_DEMO_FORM_URL ?? "/waitlist";
