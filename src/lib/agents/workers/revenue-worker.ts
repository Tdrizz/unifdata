import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { buildRevenuePrompt, buildRevenueUserMessage, buildTelemetryBlock } from "@/lib/ai/prompts";
import type { TelemetrySnapshot } from "../telemetry";
import type { IndustryProfile } from "@/lib/industry-profiles";

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
): Promise<void> {
  // Fetch the top unpaid invoices for supplementary detail
  const { data: invoiceDetails } = await supabase
    .from("sales")
    .select("id, amount, payment_status, sale_date, service_type")
    .eq("company_id", orgId)
    .not("payment_status", "ilike", "paid")
    .order("amount", { ascending: false })
    .limit(5);

  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.revenue,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildRevenuePrompt(profile) },
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

  if (!parsed.success || parsed.data.alerts.length === 0) return;

  await supabase.from("agent_alerts").insert(
    parsed.data.alerts.map((alert) => ({
      organization_id: orgId,
      alert_type: "revenue",
      severity: alert.severity,
      title: alert.title,
      body: alert.body,
      record_id: alert.record_id ?? null,
      reasoning: alert.reasoning ?? null,
    })),
  );
}
