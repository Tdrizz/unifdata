import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { buildRevenuePrompt, buildRevenueUserMessage, buildTelemetryBlock } from "@/lib/ai/prompts";
import { logGeneration } from "@/lib/observability/tracing";
import type { TraceContext } from "@/lib/observability/tracing";
import type { TelemetrySnapshot } from "../telemetry";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { hasRecentAlert, recordExists } from "@/lib/agents/memory";
import { isUnpaid } from "@/lib/status";

const RevenueAlertSchema = z.object({
  alerts: z
    .array(
      z.object({
        severity: z.enum(["info", "warning", "critical"]),
        title: z.string().max(100),
        body: z.string().max(400),
        record_id: z.string().uuid().optional(),
        reasoning: z.string().max(300).optional(),
      }),
    )
    .max(3),
});

export async function runRevenueWorker(
  snapshot: TelemetrySnapshot,
  orgId: string,
  supabase: SupabaseClient,
  profile: IndustryProfile,
  ctx: TraceContext,
): Promise<void> {
  // "Not literally paid" also matched refunded, voided, draft and blank rows,
  // so the owner was shown money owed that nobody actually owes. isUnpaid()
  // matches only genuinely outstanding invoices. Fetch a wider window and
  // narrow in JS, since the filter can't be expressed in SQL safely.
  const { data: candidateInvoices } = await supabase
    .from("sales")
    .select("id, amount, payment_status, sale_date, service_type")
    .eq("company_id", orgId)
    .order("amount", { ascending: false })
    .limit(50);

  const invoiceDetails = (candidateInvoices ?? [])
    .filter((s) => isUnpaid((s as { payment_status: string | null }).payment_status))
    .slice(0, 5);

  const start = Date.now();
  const systemPrompt = buildRevenuePrompt(profile);

  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.revenue,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: buildRevenueUserMessage(
          buildTelemetryBlock(snapshot),
          invoiceDetails ?? [],
        ),
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = RevenueAlertSchema.safeParse(JSON.parse(raw));

  logGeneration(ctx, {
    name: "revenue-alerts",
    model: AI_MODELS.revenue,
    prompt: systemPrompt,
    completion: raw,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - start,
    zodPassed: parsed.success,
    error: parsed.success ? undefined : parsed.error.message,
  });

  if (!parsed.success || parsed.data.alerts.length === 0) return;

  const freshAlerts: Array<{ alert: typeof parsed.data.alerts[number]; recordId: string | null }> = [];
  for (const alert of parsed.data.alerts) {
    if (await hasRecentAlert(orgId, "revenue", alert.record_id ?? null)) continue;
    // Drop an invented record id rather than shipping a card that 404s.
    const recordId = (await recordExists(orgId, alert.record_id)) ? alert.record_id! : null;
    freshAlerts.push({ alert, recordId });
  }
  if (freshAlerts.length === 0) return;

  await supabase.from("agent_alerts").insert(
    freshAlerts.map(({ alert, recordId }) => ({
      organization_id: orgId,
      alert_type: "revenue",
      severity: alert.severity,
      title: alert.title,
      body: alert.body,
      record_id: recordId,
      reasoning: alert.reasoning ?? null,
    })),
  );
}
