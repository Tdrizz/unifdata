import type { IndustryProfile } from "@/lib/industry-profiles";
import { buildVocabularyBlock, buildVoiceBlock } from "./shared";

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
    "Write clearly and directly. State the facts plainly and name what's overdue.",
  firm:
    "Be plain and businesslike about how overdue these are. Still no alarm -- longer-overdue is a fact to state, not a reason to raise your voice.",
  urgent:
    "These have been outstanding a long time. Say so plainly and specifically (the actual day count, not a vague sense of urgency) -- being calm and precise carries more weight here than sounding alarmed does.",
};

export function buildRecordNudgerPrompt(
  profile: IndustryProfile,
  toneStage: NudgeToneStage = "gentle",
): string {
  return `You analyze stale business records and format concise alert cards for a business owner.
Focus on facts only. Do not speculate or recommend actions.

Tone: ${TONE_INSTRUCTIONS[toneStage]}

${buildVoiceBlock()}

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
- info: 1–2 stale records
- warning: 3 or more stale records, or any single record overdue 30+ days
- critical: reserve this for money at real risk today, not for how many
  records are overdue or how long. A pile of overdue follow-ups is a
  "warning" no matter how large the pile is.`;
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
