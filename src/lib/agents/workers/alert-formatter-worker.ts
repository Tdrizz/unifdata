import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";

const AgentAlertSchema = z.object({
  alerts: z.array(
    z.object({
      alert_type: z.string().max(40),
      severity: z.enum(["info", "warning", "critical"]),
      title: z.string().max(100),
      body: z.string().max(400),
    }),
  ).max(5),
});

type AlertPayload = {
  overdueFollowUpCount?: number;
  staleJobCount?: number;
  newCustomersNoFollowUp?: number;
  revenueDeltaPct?: number;
  [key: string]: unknown;
};

export async function runAlertFormatterWorker(
  payload: AlertPayload,
  orgId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const signals = Object.entries(payload)
    .filter(([, v]) => typeof v === "number" && v !== 0)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  if (!signals) return;

  const prompt = `Format the following operational signals into concise, actionable notification cards for a business owner.

Signals:
${signals}

Only create alerts for signals that actually need attention. Keep titles short (under 10 words) and body text under 2 sentences.

Respond with ONLY valid JSON:
{
  "alerts": [
    { "alert_type": "string", "severity": "info"|"warning"|"critical", "title": "...", "body": "..." }
  ]
}`;

  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.alertFormatter,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
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
    })),
  );
}
