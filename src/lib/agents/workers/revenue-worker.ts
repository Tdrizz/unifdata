import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import type { TelemetrySnapshot } from "../telemetry";

const RevenueAlertSchema = z.object({
  alerts: z.array(
    z.object({
      severity: z.enum(["info", "warning", "critical"]),
      title: z.string().max(100),
      body: z.string().max(400),
      record_id: z.string().uuid().optional(),
    }),
  ).max(5),
});

export async function runRevenueWorker(
  snapshot: TelemetrySnapshot,
  orgId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const prompt = `You are a financial risk analyst reviewing business metrics. Generate concise, actionable alert cards for the finance team.

Metrics (pre-computed by database):
- Revenue this week: $${Math.round(snapshot.revenueThisWeek).toLocaleString()}
- 4-week average: $${Math.round(snapshot.revenueFourWeekAvg).toLocaleString()}
- Delta: ${snapshot.revenueDeltaPct > 0 ? "+" : ""}${snapshot.revenueDeltaPct}%
- Unpaid invoices ≥30 days: ${snapshot.unpaidInvoiceCount} records, $${Math.round(snapshot.unpaidInvoiceTotal).toLocaleString()} total

Generate alert cards only for issues that genuinely need attention. Use severity "critical" for revenue down >20% or unpaid total >$5,000.

Respond with ONLY valid JSON:
{
  "alerts": [
    { "severity": "info"|"warning"|"critical", "title": "...", "body": "..." }
  ]
}`;

  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.revenue,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = RevenueAlertSchema.safeParse(JSON.parse(raw));

  if (!parsed.success || parsed.data.alerts.length === 0) return;

  await supabase.from("agent_alerts").insert(
    parsed.data.alerts.map((alert) => ({
      organization_id: orgId,
      alert_type: "revenue",
      severity: alert.severity,
      title: alert.title,
      body: alert.body,
      record_id: alert.record_id ?? null,
    })),
  );
}
