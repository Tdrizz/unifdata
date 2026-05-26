import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { isPro } from "@/lib/feature-gates";
import { getMemory, recordSignalFired, getEscalationLevel, hoursSince } from "@/lib/agents/memory";
import { buildRecordNudgerPrompt, buildRecordNudgerUserMessage } from "@/lib/ai/prompts/record-nudger";
import { logGeneration, createNightlyTrace, flushLangfuse } from "@/lib/observability/tracing";

const NudgerAlertSchema = z.array(
  z.object({
    alert_type: z.string().max(40),
    severity: z.enum(["info", "warning", "critical"]),
    title: z.string().max(100),
    body: z.string().max(400),
    reasoning: z.string().max(300).optional(),
  }),
).max(4);

const COOLDOWN_HOURS = 24;

export async function runRecordNudgerWorker(
  orgId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const { data: company } = await supabase
    .from("companies")
    .select("id, business_sector, tier")
    .eq("id", orgId)
    .single();

  if (!company || !isPro(company as { tier: string })) return;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const tenDaysAgo = new Date(now.getTime() - 10 * 86400000).toISOString();

  const [overdueResult, staleResult] = await Promise.all([
    supabase
      .from("follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("company_id", orgId)
      .neq("status", "complete")
      .lt("due_date", sevenDaysAgo),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", orgId)
      .not("status", "in", "(completed,cancelled)")
      .lt("updated_at", tenDaysAgo),
  ]);

  const overdueFollowUpCount = overdueResult.count ?? 0;
  const staleJobCount = staleResult.count ?? 0;

  if (overdueFollowUpCount === 0 && staleJobCount === 0) return;

  // Check cooldown — skip signals that fired within the last 24 hours
  const [overdueMem, staleMem] = await Promise.all([
    overdueFollowUpCount > 0 ? getMemory(orgId, "overdue_followups") : Promise.resolve(null),
    staleJobCount > 0 ? getMemory(orgId, "stale_jobs") : Promise.resolve(null),
  ]);

  const shouldFireOverdue =
    overdueFollowUpCount > 0 && (!overdueMem || hoursSince(overdueMem.last_fired_at) >= COOLDOWN_HOURS);
  const shouldFireStale =
    staleJobCount > 0 && (!staleMem || hoursSince(staleMem.last_fired_at) >= COOLDOWN_HOURS);

  if (!shouldFireOverdue && !shouldFireStale) return;

  const profile = getIndustryProfile(company.business_sector);
  const systemPrompt = buildRecordNudgerPrompt(profile);
  const userMessage = buildRecordNudgerUserMessage(
    shouldFireStale ? staleJobCount : 0,
    shouldFireOverdue ? overdueFollowUpCount : 0,
    profile,
  );

  const ctx = createNightlyTrace(orgId, now.toISOString().split("T")[0]);
  const start = Date.now();

  try {
    const response = await aiRouter.chat.completions.create({
      model: AI_MODELS.alertFormatter,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "[]";
    let parsed: z.infer<typeof NudgerAlertSchema> | null = null;

    try {
      const jsonData = JSON.parse(raw);
      const result = NudgerAlertSchema.safeParse(Array.isArray(jsonData) ? jsonData : jsonData.alerts ?? []);
      if (result.success) parsed = result.data;
    } catch { /* ignore parse error */ }

    logGeneration(ctx, {
      name: "record-nudger",
      model: AI_MODELS.alertFormatter,
      prompt: systemPrompt,
      completion: raw,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - start,
      zodPassed: parsed !== null,
    });

    if (parsed && parsed.length > 0) {
      // Compute escalation levels and build inserts
      const alertInserts = await Promise.all(
        parsed.map(async (alert) => {
          const signalType = alert.alert_type;
          const escalationLevel = await getEscalationLevel(orgId, signalType);
          return {
            organization_id: orgId,
            alert_type: alert.alert_type,
            severity: alert.severity,
            title: alert.title,
            body: alert.body,
            reasoning: alert.reasoning ?? null,
            escalation_level: escalationLevel,
          };
        }),
      );

      await supabase.from("agent_alerts").insert(alertInserts);
    }

    // Record signal fires after successful insert
    await Promise.all([
      shouldFireOverdue && recordSignalFired(orgId, "overdue_followups"),
      shouldFireStale && recordSignalFired(orgId, "stale_jobs"),
    ]);

    await supabase.from("agent_logs").insert({
      organization_id: orgId,
      agent_name: "record-nudger",
      events_fired: parsed?.length ?? 0,
    });
  } finally {
    await flushLangfuse();
  }
}
