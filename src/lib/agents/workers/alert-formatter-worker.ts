import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { buildAlertFormatterPrompt, buildAlertFormatterUserMessage } from "@/lib/ai/prompts";
import type { IndustryProfile } from "@/lib/industry-profiles";

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
  // Support both the new spec format and the legacy key-value format
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
): Promise<void> {
  const signals = normalizeSignals(payload);
  if (signals.length === 0) return;

  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.alertFormatter,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildAlertFormatterPrompt(profile) },
      { role: "user", content: buildAlertFormatterUserMessage(signals) },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = AgentAlertSchema.safeParse(JSON.parse(raw));

  if (!parsed.success || parsed.data.alerts.length === 0) return;

  await supabase.from("agent_alerts").insert(
    parsed.data.alerts.map((alert) => ({
      organization_id: orgId,
      alert_type: alert.alert_type,
      severity: alert.severity,
      title: alert.title,
      body: alert.body,
      record_id: alert.record_id ?? null,
      reasoning: alert.reasoning ?? null,
    })),
  );
}
