import { z } from "zod";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { buildManagerPrompt, buildManagerUserMessage, buildTelemetryBlock } from "@/lib/ai/prompts";
import type { TelemetrySnapshot } from "./telemetry";
import type { IndustryProfile } from "@/lib/industry-profiles";

const WorkerTaskSchema = z.object({
  worker: z.enum(["outreach", "revenue", "data_quality", "alert_formatter"]),
  payload: z.record(z.string(), z.unknown()),
  priority: z.enum(["high", "medium", "low"]),
});

const ManagerBlueprintSchema = z.object({
  assessment: z.string().max(500),
  tasks: z.array(WorkerTaskSchema).max(8),
});

export type ManagerBlueprint = z.infer<typeof ManagerBlueprintSchema>;
export type WorkerTask = z.infer<typeof WorkerTaskSchema>;

async function callManager(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.manager,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function runManagerAgent(
  snapshot: TelemetrySnapshot,
  profile: IndustryProfile,
  company: { name: string },
): Promise<ManagerBlueprint> {
  const today = new Date().toISOString().split("T")[0];
  const systemPrompt = buildManagerPrompt(profile);
  const userMessage = buildManagerUserMessage(
    buildTelemetryBlock(snapshot),
    today,
    company.name,
  );

  const raw1 = await callManager(systemPrompt, userMessage);
  const parsed1 = ManagerBlueprintSchema.safeParse(JSON.parse(raw1));
  if (parsed1.success) return parsed1.data;

  // Retry with schema instruction prepended to user message
  const retryMessage = `Respond ONLY with valid JSON matching the schema. No preamble.\n\n${userMessage}`;
  const raw2 = await callManager(systemPrompt, retryMessage);
  const parsed2 = ManagerBlueprintSchema.safeParse(JSON.parse(raw2));
  if (parsed2.success) return parsed2.data;

  throw Object.assign(new Error("Manager blueprint parse failed after 2 attempts"), {
    rawResponse: raw2,
  });
}
