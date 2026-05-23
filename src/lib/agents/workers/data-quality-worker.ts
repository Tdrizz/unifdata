import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { isAutopilot } from "@/lib/feature-gates";

const DataQualitySchema = z.object({
  auto_approve: z.array(z.string()).max(20),
  needs_review: z.array(z.string()).max(20),
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

  const prompt = `You are a data quality analyst reviewing pending data reconciliation proposals. Each proposal has a confidence score (0-1) and reasoning.

Proposals:
${JSON.stringify(proposals, null, 2)}

For each proposal ID, decide if it should be:
- auto_approve: High confidence (>0.85), change looks safe and correct
- needs_review: Lower confidence or ambiguous change, human should review

Respond with ONLY valid JSON:
{
  "auto_approve": ["uuid1", "uuid2"],
  "needs_review": ["uuid3"]
}`;

  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.dataQuality,
    temperature: 0.0,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = DataQualitySchema.safeParse(JSON.parse(raw));

  if (!parsed.success) return;

  const { auto_approve, needs_review } = parsed.data;

  if (isAutopilot(company)) {
    // Autopilot: auto-apply approved proposals
    if (auto_approve.length > 0) {
      await supabase
        .from("data_reconciliation_proposals")
        .update({ status: "auto_applied" })
        .in("id", auto_approve)
        .eq("organization_id", company.id);
    }
  } else {
    // Co-Pilot: mark proposals with recommendation
    if (auto_approve.length > 0) {
      await supabase
        .from("data_reconciliation_proposals")
        .update({ status: "pending" })
        .in("id", auto_approve)
        .eq("organization_id", company.id);
    }
  }

  if (needs_review.length > 0) {
    await supabase
      .from("data_reconciliation_proposals")
      .update({ status: "pending" })
      .in("id", needs_review)
      .eq("organization_id", company.id);
  }
}
