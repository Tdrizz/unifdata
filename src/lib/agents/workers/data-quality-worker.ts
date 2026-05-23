import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { isAutopilot } from "@/lib/feature-gates";
import { buildDataQualityPrompt, buildDataQualityUserMessage } from "@/lib/ai/prompts";

const DataQualityDecisionSchema = z.object({
  decisions: z.array(
    z.object({
      proposal_id: z.string(),
      action: z.enum(["AUTO_APPROVE", "NEEDS_REVIEW", "AUTO_IGNORE"]),
      confidence: z.number().min(0).max(1),
      reasoning: z.string().max(300),
    }),
  ).max(20),
});

export async function runDataQualityWorker(
  company: { id: string; preferences?: Record<string, unknown> },
  supabase: SupabaseClient,
): Promise<void> {
  const { data: proposals } = await supabase
    .from("data_reconciliation_proposals")
    .select("id, target_table, proposed_changes, confidence_score, raw_reasoning")
    .eq("organization_id", company.id)
    .eq("status", "pending")
    .order("confidence_score", { ascending: false })
    .limit(20);

  if (!proposals || proposals.length === 0) return;

  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.dataQuality,
    temperature: 0.0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildDataQualityPrompt() },
      { role: "user", content: buildDataQualityUserMessage(proposals) },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = DataQualityDecisionSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) return;

  const { decisions } = parsed.data;

  const autoApprove = decisions.filter((d) => d.action === "AUTO_APPROVE").map((d) => d.proposal_id);
  const autoIgnore = decisions.filter((d) => d.action === "AUTO_IGNORE").map((d) => d.proposal_id);

  if (isAutopilot(company)) {
    if (autoApprove.length > 0) {
      await supabase
        .from("data_reconciliation_proposals")
        .update({ status: "auto_applied" })
        .in("id", autoApprove)
        .eq("organization_id", company.id);
    }
  }

  if (autoIgnore.length > 0) {
    await supabase
      .from("data_reconciliation_proposals")
      .update({ status: "dismissed" })
      .in("id", autoIgnore)
      .eq("organization_id", company.id);
  }
}
