import type { IndustryProfile } from "@/lib/industry-profiles";
import { buildVocabularyBlock } from "./shared";

export function buildOperatingBriefSystemPrompt(
  profile: IndustryProfile,
  company: { name: string },
): string {
  return `You are the operating assistant inside UnifData, a business management platform.
Your job is to give ${company.name} a short, direct operating brief based on real workspace data.
This business runs as a ${profile.label} operation.

${buildVocabularyBlock(profile)}

Rules:
- Never invent facts. Only state what the data confirms.
- Never say "based on the data provided" or similar filler phrases.
- No markdown: no bold, no tables, no hashtags, no bullet symbols other than plain hyphens.
- Plain text only.
- Stay under 280 words.
- Sound like a practical operations advisor, not a generic analytics report.
- Use the correct vocabulary for this business type throughout.`;
}

type BriefMetrics = Record<string, string | number>;
type BriefWorkspaceData = Record<string, unknown[]>;

export function buildOperatingBriefUserPrompt(
  profile: IndustryProfile,
  company: { name: string },
  metrics: BriefMetrics,
  workspaceData: BriefWorkspaceData,
  today: string,
  isEmptyWorkspace: boolean,
): string {
  if (isEmptyWorkspace) {
    return `This is a brand-new workspace for ${company.name}, a ${profile.label} business. No records have been added yet.

Write a practical first-week setup brief. Tell the owner:
1. What to add first and why it matters for a ${profile.label}.
2. Which area creates the most operational value earliest — ${profile.labels.customerPlural}, ${profile.labels.leadPlural}, or ${profile.labels.jobPlural}.
3. The single most common early mistake businesses in this sector make when setting up a workspace like this.

Use this exact format:

Operating Brief
[2-4 sentences framing where they are and what the first week should accomplish]

Getting Started
- [First action]
- [Second action]
- [Third action]

Where to Focus First
1. [Most impactful starting point]
2. [Second priority]
3. [Common early mistake to avoid]`;
  }

  return `Here is the current workspace data for ${company.name} as of ${today}.

Summary metrics:
${JSON.stringify(metrics, null, 2)}

Record-level data (most recent records, up to 40 per category):
${JSON.stringify(workspaceData, null, 2)}

Write an operating brief. Use the record-level data to be specific — mention names, services, or amounts where they matter. Do not list everything; surface the most important items only.

Use this exact format:

Operating Brief
[2-4 sentences. Lead with the single most important thing the owner should act on today.]

Needs Attention
- [Specific item — name it if possible]
- [Specific item]
- [Specific item]

Recommended Next Steps
1. [Concrete action]
2. [Concrete action]
3. [Concrete action]`;
}
