import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { buildAlertFormatterPrompt, buildAlertFormatterUserMessage } from "@/lib/ai/prompts";
import { logGeneration } from "@/lib/observability/tracing";
import type { TraceContext } from "@/lib/observability/tracing";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { getEscalationLevel, recordSignalFired } from "@/lib/agents/memory";

const AgentAlertSchema = z.object({
  alerts: z
    .array(
      z.object({
        alert_type: z.string().max(40),
        severity: z.enum(["info", "warning", "critical"]),
        title: z.string().max(100),
        body: z.string().max(400),
        reasoning: z.string().max(300).optional(),
        record_id: z.string().nullable().optional(),
      }),
    )
    .max(5),
});

type AlertPayload = Record<string, unknown>;

function normalizeSignals(
  payload: AlertPayload,
): Array<{ type: string; value: number; context: string }> {
  if (payload.signal_type !== undefined && payload.signal_value !== undefined) {
    return [
      {
        type: String(payload.signal_type),
        value: Number(payload.signal_value),
        context: String(payload.context ?? ""),
      },
    ];
  }
  return Object.entries(payload)
    .filter(([, v]) => typeof v === "number" && (v as number) !== 0)
    .map(([k, v]) => ({ type: k, value: v as number, context: "" }));
}

export async function runAlertFormatterWorker(
  payload: AlertPayload,
  orgId: string,
  supabase: SupabaseClient,
  profile: IndustryProfile,
  ctx: TraceContext,
): Promise<void> {
  const signals = normalizeSignals(payload);
  if (signals.length === 0) return;

  const start = Date.now();
  const systemPrompt = buildAlertFormatterPrompt(profile);

  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.alertFormatter,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildAlertFormatterUserMessage(signals) },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = AgentAlertSchema.safeParse(JSON.parse(raw));

  logGeneration(ctx, {
    name: "alert-cards",
    model: AI_MODELS.alertFormatter,
    prompt: systemPrompt,
    completion: raw,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - start,
    zodPassed: parsed.success,
    error: parsed.success ? undefined : parsed.error.message,
  });

  if (!parsed.success || parsed.data.alerts.length === 0) return;

  const primarySignalType = signals[0]?.type ?? "alert";

  const alertInserts = await Promise.all(
    parsed.data.alerts.map(async (alert) => {
      const escalationLevel = await getEscalationLevel(orgId, alert.alert_type);
      return {
        organization_id: orgId,
        alert_type: alert.alert_type,
        severity: alert.severity,
        title: alert.title,
        body: alert.body,
        record_id: alert.record_id ?? null,
        reasoning: alert.reasoning ?? null,
        escalation_level: escalationLevel,
      };
    }),
  );

  await supabase.from("agent_alerts").insert(alertInserts);
  await recordSignalFired(orgId, primarySignalType);
}
