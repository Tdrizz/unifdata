import { z } from "zod";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import type { TelemetrySnapshot } from "./telemetry";
import type { IndustryProfile } from "@/lib/industry-profiles";

const WorkerTaskSchema = z.object({
  worker: z.enum(["outreach", "revenue", "data_quality", "ui_alert_formatter"]),
  payload: z.record(z.string(), z.unknown()),
  priority: z.enum(["high", "medium", "low"]),
});

const ManagerBlueprintSchema = z.object({
  assessment: z.string().max(500),
  tasks: z.array(WorkerTaskSchema).max(10),
});

export type ManagerBlueprint = z.infer<typeof ManagerBlueprintSchema>;
export type WorkerTask = z.infer<typeof WorkerTaskSchema>;

const SCHEMA_INSTRUCTION =
  "Respond with ONLY a valid JSON object matching this schema, no explanation or preamble:";

const SCHEMA_DOCS = `{
  "assessment": "string (max 500 chars — brief operational summary)",
  "tasks": [
    {
      "worker": "outreach" | "revenue" | "data_quality" | "ui_alert_formatter",
      "payload": { ...relevant data for the worker },
      "priority": "high" | "medium" | "low"
    }
  ]
}`;

function buildPrompt(snapshot: TelemetrySnapshot, profile: IndustryProfile): string {
  const facts = [
    `1. Overdue ${profile.labels.followUpPlural} (>7 days): ${snapshot.overdueFollowUpCount}`,
    `2. Revenue this week: $${Math.round(snapshot.revenueThisWeek).toLocaleString()} vs 4-week avg: $${Math.round(snapshot.revenueFourWeekAvg).toLocaleString()} (delta: ${snapshot.revenueDeltaPct > 0 ? "+" : ""}${snapshot.revenueDeltaPct}%)`,
    `3. Stale ${profile.labels.jobPlural} (no update in 10+ days, not closed): ${snapshot.staleJobCount}`,
    `4. New ${profile.labels.customerPlural} in last 7 days with no ${profile.labels.followUpSingular}: ${snapshot.newCustomersNoFollowUp}`,
    `5. Unpaid ${profile.labels.salePlural} ≥30 days old: ${snapshot.unpaidInvoiceCount} records totaling $${Math.round(snapshot.unpaidInvoiceTotal).toLocaleString()}`,
    `6. Pending data reconciliation proposals: ${snapshot.pendingDataProposals}`,
  ].join("\n");

  return `You are the strategic director for a ${profile.label} business. Analyze the following business metrics and determine which specialist workers to deploy tonight.

Metrics:
${facts}

Available workers:
- outreach: Drafts personalized email/SMS follow-ups for idle customers or overdue accounts
- revenue: Audits financial risk and flags outstanding payment issues
- data_quality: Reviews data reconciliation proposals and recommends auto-approvals
- ui_alert_formatter: Formats operational warnings into actionable notification cards

${SCHEMA_INSTRUCTION}
${SCHEMA_DOCS}

Only include workers that are genuinely needed based on the metrics. Omit workers if there is nothing significant to act on.`;
}

async function callManager(prompt: string): Promise<string> {
  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.manager,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function runManagerAgent(
  snapshot: TelemetrySnapshot,
  profile: IndustryProfile,
): Promise<ManagerBlueprint> {
  const basePrompt = buildPrompt(snapshot, profile);

  // Attempt 1
  const raw1 = await callManager(basePrompt);
  const parsed1 = ManagerBlueprintSchema.safeParse(JSON.parse(raw1));
  if (parsed1.success) return parsed1.data;

  // Attempt 2: prepend strict schema instruction
  const retryPrompt = `${SCHEMA_INSTRUCTION}\n${SCHEMA_DOCS}\n\n${basePrompt}`;
  const raw2 = await callManager(retryPrompt);
  const parsed2 = ManagerBlueprintSchema.safeParse(JSON.parse(raw2));
  if (parsed2.success) return parsed2.data;

  // Both failed — throw with raw response for caller to log
  throw Object.assign(new Error("Manager blueprint parse failed after 2 attempts"), {
    rawResponse: raw2,
  });
}
