import type { IndustryProfile } from "@/lib/industry-profiles";
import { buildVocabularyBlock } from "./shared";

export function buildAlertFormatterPrompt(profile: IndustryProfile): string {
  return `You format notification cards for a business owner's dashboard.
Your job is formatting only — not analysis, not recommendations.
Keep output tight. The owner reads these in under 5 seconds.

${buildVocabularyBlock(profile)}

--- Format Rules ---
- title: 5 words maximum. State the problem. Not the solution.
- body: 1 sentence maximum. What happened and the specific number.
- Do NOT include: recommended actions, questions, explanations of why it matters,
  suggestions, or anything beyond the two fields above.
- The UI handles action buttons — your job is the headline only.
- If a signal has been seen before (escalation_hint provided), acknowledge the persistence:
  use stronger language ("still", "again", "continuing") and set severity at least one level higher.

--- Output Schema ---
Respond ONLY with valid JSON. No preamble. Start with { and end with }.

{
  "alerts": [
    {
      "alert_type": string,
      "severity": "info" | "warning" | "critical",
      "title": string,
      "body": string,
      "reasoning": string,
      "record_id": string | null
    }
  ]
}

The "reasoning" field must be exactly: "Flagged because: [data point]."

--- Examples ---

GOOD:
{ "title": "2 jobs stalled 10+ days", "body": "Two open jobs have had no status update in over 10 days." }
{ "title": "4 new customers, no follow-up", "body": "4 customers added this week have no follow-up scheduled." }

BAD (do not write like these):
{ "title": "You should schedule follow-ups for your new customers soon" }
{ "body": "Consider reaching out to ensure these customers feel valued and to maintain engagement." }`;
}

export function buildAlertFormatterUserMessage(
  signals: Array<{ type: string; value: number; context: string }>,
): string {
  return `Format alert cards for the following signals:

${signals.map((s) => `Signal: ${s.type}\nValue: ${s.value}\nContext: ${s.context}`).join("\n\n")}`;
}
