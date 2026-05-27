import { z } from "zod";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { buildManagerPrompt, buildManagerUserMessage, buildTelemetryBlock } from "@/lib/ai/prompts";
import { startSpan, endSpan, logGeneration } from "@/lib/observability/tracing";
import type { TraceContext } from "@/lib/observability/tracing";
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
): Promise<{ raw: string; inputTokens: number; outputTokens: number }> {
  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.manager,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  return {
    raw: response.choices[0]?.message?.content ?? "",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

export async function runManagerAgent(
  snapshot: TelemetrySnapshot,
  profile: IndustryProfile,
  company: { name: string },
  ctx: TraceContext,
): Promise<ManagerBlueprint> {
  const today = new Date().toISOString().split("T")[0];
  const systemPrompt = buildManagerPrompt(profile);
  const userMessage = buildManagerUserMessage(
    buildTelemetryBlock(snapshot),
    today,
    company.name,
  );

  const span = startSpan(ctx, "manager-agent", {
    snapshotSummary: buildTelemetryBlock(snapshot),
  });

  const start = Date.now();
  let lastRaw = "";
  let lastInputTokens = 0;
  let lastOutputTokens = 0;

  try {
    const attempt1 = await callManager(systemPrompt, userMessage);
    lastRaw = attempt1.raw;
    lastInputTokens = attempt1.inputTokens;
    lastOutputTokens = attempt1.outputTokens;

    const parsed1 = ManagerBlueprintSchema.safeParse(JSON.parse(lastRaw));
    if (parsed1.success) {
      logGeneration(span, {
        name: "manager-blueprint",
        model: AI_MODELS.manager,
        prompt: systemPrompt,
        completion: lastRaw,
        inputTokens: lastInputTokens,
        outputTokens: lastOutputTokens,
        latencyMs: Date.now() - start,
        zodPassed: true,
      });
      endSpan(span, {
        taskCount: parsed1.data.tasks.length,
        assessment: parsed1.data.assessment,
      });
      return parsed1.data;
    }

    // Retry with schema reminder
    const retryMessage = `Respond ONLY with valid JSON matching the schema. No preamble.\n\n${userMessage}`;
    const attempt2 = await callManager(systemPrompt, retryMessage);
    lastRaw = attempt2.raw;
    lastInputTokens += attempt2.inputTokens;
    lastOutputTokens += attempt2.outputTokens;

    const parsed2 = ManagerBlueprintSchema.safeParse(JSON.parse(lastRaw));
    if (parsed2.success) {
      logGeneration(span, {
        name: "manager-blueprint",
        model: AI_MODELS.manager,
        prompt: systemPrompt,
        completion: lastRaw,
        inputTokens: lastInputTokens,
        outputTokens: lastOutputTokens,
        latencyMs: Date.now() - start,
        zodPassed: true,
      });
      endSpan(span, {
        taskCount: parsed2.data.tasks.length,
        assessment: parsed2.data.assessment,
      });
      return parsed2.data;
    }

    logGeneration(span, {
      name: "manager-blueprint",
      model: AI_MODELS.manager,
      prompt: systemPrompt,
      completion: lastRaw,
      inputTokens: lastInputTokens,
      outputTokens: lastOutputTokens,
      latencyMs: Date.now() - start,
      zodPassed: false,
      error: parsed2.error.message,
    });
    endSpan(span, { error: "parse failed after 2 attempts" });

    throw Object.assign(new Error("Manager blueprint parse failed after 2 attempts"), {
      rawResponse: lastRaw,
    });
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("parse failed"))) {
      logGeneration(span, {
        name: "manager-blueprint",
        model: AI_MODELS.manager,
        prompt: systemPrompt,
        completion: lastRaw,
        inputTokens: lastInputTokens,
        outputTokens: lastOutputTokens,
        latencyMs: Date.now() - start,
        zodPassed: false,
        error: String(error),
      });
      endSpan(span, { error: String(error) });
    }
    throw error;
  }
}
