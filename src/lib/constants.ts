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
