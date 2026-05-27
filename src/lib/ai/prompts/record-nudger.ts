import type { IndustryProfile } from "@/lib/industry-profiles";
import { buildVocabularyBlock } from "./shared";

export type NudgeToneStage = "gentle" | "direct" | "firm" | "urgent";

export function getToneStage(maxDaysOverdue: number): NudgeToneStage {
  if (maxDaysOverdue < 30) return "gentle";
  if (maxDaysOverdue < 45) return "direct";
  if (maxDaysOverdue < 60) return "firm";
  return "urgent";
}

const TONE_INSTRUCTIONS: Record<NudgeToneStage, string> = {
  gentle:
    "Write with a supportive, non-alarming tone. Acknowledge that things get busy. Surface the gap as something worth checking on, not a crisis.",
  direct:
    "Write clearly and directly. Avoid hedging or softening language. State the facts plainly and make clear that action is needed.",
  firm:
    "Be firm and businesslike. These records are significantly overdue. Use language that conveys professional urgency without dramatising.",
  urgent:
    "Be urgent and unambiguous. These records have been neglected for 60+ days. Do not soften the message — make clear that immediate attention is required.",
};

export function buildRecordNudgerPrompt(
  profile: IndustryProfile,
  toneStage: NudgeToneStage = "gentle",
): string {
  return `You analyze stale business records and format concise alert cards for a business owner.
Focus on facts only. Do not speculate or recommend actions.

Tone: ${TONE_INSTRUCTIONS[toneStage]}

${buildVocabularyBlock(profile)}

--- Output Schema ---
Respond ONLY with valid JSON. No preamble. Start with [ and end with ].

[
  {
    "alert_type": string,     // e.g. "stale_jobs", "overdue_followups"
    "severity": "info" | "warning" | "critical",
    "title": string,          // 5 words max
    "body": string,           // 1 sentence, cite the specific number
    "reasoning": string       // "Flagged because: [data point]."
  }
]

Severity guide:
- info: 1–2 stale records, minor overdue
- warning: 3–5 stale records, moderately overdue
- critical: 6+ stale records, severely overdue (14+ days)`;
}

export function buildRecordNudgerUserMessage(
  staleJobCount: number,
  overdueFollowUpCount: number,
  profile: IndustryProfile,
  maxDaysOverdue?: number,
  maxStaleDays?: number,
): string {
  const lines: string[] = [];
  if (staleJobCount > 0) {
    const staleDaysStr = maxStaleDays ? ` (oldest: ${maxStaleDays} days)` : " (10+ days)";
    lines.push(
      `${staleJobCount} ${staleJobCount === 1 ? profile.labels.jobSingular : profile.labels.jobPlural} with no update${staleDaysStr}`,
    );
  }
  if (overdueFollowUpCount > 0) {
    const overdueDaysStr = maxDaysOverdue ? ` (oldest: ${maxDaysOverdue} days overdue)` : " (7+ days)";
    lines.push(
      `${overdueFollowUpCount} ${overdueFollowUpCount === 1 ? profile.labels.followUpSingular : profile.labels.followUpPlural} overdue${overdueDaysStr}`,
    );
  }
  return `Format alert cards for these stale records:\n\n${lines.join("\n")}`;
}
