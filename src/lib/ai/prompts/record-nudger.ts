import type { IndustryProfile } from "@/lib/industry-profiles";
import { buildVocabularyBlock } from "./shared";

export function buildRecordNudgerPrompt(profile: IndustryProfile): string {
  return `You analyze stale business records and format concise alert cards for a business owner.
Focus on facts only. Do not speculate or recommend actions.

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
): string {
  const lines: string[] = [];
  if (staleJobCount > 0) {
    lines.push(`${staleJobCount} ${staleJobCount === 1 ? profile.labels.jobSingular : profile.labels.jobPlural} with no update in 10+ days`);
  }
  if (overdueFollowUpCount > 0) {
    lines.push(`${overdueFollowUpCount} ${overdueFollowUpCount === 1 ? profile.labels.followUpSingular : profile.labels.followUpPlural} overdue by 7+ days`);
  }
  return `Format alert cards for these stale records:\n\n${lines.join("\n")}`;
}
