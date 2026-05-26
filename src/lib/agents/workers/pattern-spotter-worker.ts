import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { isPro } from "@/lib/feature-gates";
import { logGeneration, createNightlyTrace, flushLangfuse } from "@/lib/observability/tracing";
import { buildVocabularyBlock } from "@/lib/ai/prompts/shared";

const PatternAlertSchema = z.object({
  title: z.string().max(100),
  body: z.string().max(500),
  severity: z.enum(["info", "warning"]),
});

export async function runPatternSpotterWorker(
  orgId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, business_sector, tier")
    .eq("id", orgId)
    .single();

  if (!company || !isPro(company as { tier: string })) return;

  // Revenue aggregates are org-level; no per-contact filtering needed here.
  // Exclude closed contacts from any future per-contact analysis (unaffected here).

  // Fetch 12 weeks of weekly revenue buckets
  const twelveWeeksAgo = new Date(Date.now() - 84 * 86400000).toISOString().slice(0, 10);
  const { data: salesData } = await supabase
    .from("sales")
    .select("sale_date, amount")
    .eq("company_id", orgId)
    .gte("sale_date", twelveWeeksAgo)
    .order("sale_date");

  if (!salesData || salesData.length < 4) return;

  // Bucket by ISO week
  const weeklyTotals: Record<string, number> = {};
  for (const row of salesData) {
    const date = new Date(row.sale_date);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    const key = `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    weeklyTotals[key] = (weeklyTotals[key] ?? 0) + Number(row.amount || 0);
  }

  const weekSummary = Object.entries(weeklyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, total]) => `${week}: $${Math.round(total)}`)
    .join("\n");

  const profile = getIndustryProfile(company.business_sector);
  const systemPrompt = `You analyze revenue patterns for small service businesses.
Identify 1 meaningful pattern (seasonal dip, growth trend, or anomaly) from the weekly revenue data.
If the data shows no notable pattern, say so clearly in the body.
Keep it factual — cite specific weeks and amounts.

${buildVocabularyBlock(profile)}

Respond ONLY with valid JSON:
{ "title": string, "body": string, "severity": "info" | "warning" }`;

  const userMessage = `Weekly revenue for ${company.name} (last 12 weeks):\n\n${weekSummary}`;

  const ctx = createNightlyTrace(orgId, new Date().toISOString().split("T")[0]);
  const start = Date.now();

  try {
    const response = await aiRouter.chat.completions.create({
      model: AI_MODELS.manager,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = PatternAlertSchema.safeParse(JSON.parse(raw));

    logGeneration(ctx, {
      name: "pattern-spotter",
      model: AI_MODELS.manager,
      prompt: systemPrompt,
      completion: raw,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - start,
      zodPassed: parsed.success,
    });

    if (!parsed.success) return;

    await supabase.from("agent_alerts").insert({
      organization_id: orgId,
      alert_type: "revenue_pattern",
      severity: parsed.data.severity,
      title: parsed.data.title,
      body: parsed.data.body,
      reasoning: "Monthly pattern analysis across 12 weeks of revenue data.",
      escalation_level: 0,
    });

    await supabase.from("agent_logs").insert({
      organization_id: orgId,
      agent_name: "pattern-spotter",
      events_fired: 1,
    });
  } finally {
    await flushLangfuse();
  }
}
