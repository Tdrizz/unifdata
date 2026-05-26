import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { isPro } from "@/lib/feature-gates";
import { logGeneration, createNightlyTrace, flushLangfuse } from "@/lib/observability/tracing";
import { buildVocabularyBlock } from "@/lib/ai/prompts/shared";

const ForecastAlertSchema = z.object({
  title: z.string().max(100),
  body: z.string().max(500),
  severity: z.enum(["info", "warning"]),
});

export async function runVolumeAnticipatorWorker(
  orgId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, business_sector, tier")
    .eq("id", orgId)
    .single();

  if (!company || !isPro(company as { tier: string })) return;

  // Monthly job and customer counts for last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10);

  const [jobsResult, customersResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("created_at")
      .eq("company_id", orgId)
      .gte("created_at", sixMonthsAgoStr),
    supabase
      .from("customers")
      .select("created_at")
      .eq("company_id", orgId)
      .gte("created_at", sixMonthsAgoStr),
  ]);

  if (!jobsResult.data || jobsResult.data.length < 2) return;

  // Bucket by month
  function bucketByMonth(rows: Array<{ created_at: string }>): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const month = row.created_at.slice(0, 7); // YYYY-MM
      counts[month] = (counts[month] ?? 0) + 1;
    }
    return counts;
  }

  const jobsByMonth = bucketByMonth(jobsResult.data);
  const customersByMonth = bucketByMonth(customersResult.data ?? []);

  const months = Object.keys(jobsByMonth).sort();
  const jobSummary = months.map((m) => `${m}: ${jobsByMonth[m] ?? 0} jobs, ${customersByMonth[m] ?? 0} new customers`).join("\n");

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthStr = nextMonth.toISOString().slice(0, 7);

  const profile = getIndustryProfile(company.business_sector);
  const systemPrompt = `You forecast next-month volume for a small service business.
Based on the monthly job and customer counts, estimate whether next month will be higher, lower, or similar to recent months.
Be specific: cite the trend and the expected direction. If there's too little data to forecast, say so.

${buildVocabularyBlock(profile)}

Respond ONLY with valid JSON:
{ "title": string, "body": string, "severity": "info" | "warning" }`;

  const userMessage = `Monthly volume for ${company.name}:\n\n${jobSummary}\n\nForecast for: ${nextMonthStr}`;

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
    const parsed = ForecastAlertSchema.safeParse(JSON.parse(raw));

    logGeneration(ctx, {
      name: "volume-anticipator",
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
      alert_type: "volume_forecast",
      severity: parsed.data.severity,
      title: parsed.data.title,
      body: parsed.data.body,
      reasoning: `Volume forecast for ${nextMonthStr} based on 6-month trend.`,
      escalation_level: 0,
    });

    await supabase.from("agent_logs").insert({
      organization_id: orgId,
      agent_name: "volume-anticipator",
      events_fired: 1,
    });
  } finally {
    await flushLangfuse();
  }
}
