import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getMemory, recordSignalFired, getEscalationLevel, hoursSince, hasRecentAlert, normalizeAlertType } from "@/lib/agents/memory";
import { isCompleteWork, isCancelledWork, isOpenFollowUp } from "@/lib/status";
import {
  buildRecordNudgerPrompt,
  buildRecordNudgerUserMessage,
  getToneStage,
} from "@/lib/ai/prompts/record-nudger";
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

  if (!company) return;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const tenDaysAgo = new Date(now.getTime() - 10 * 86400000).toISOString();

  // Fetch actual records (not just counts) so we can compute max days overdue
  // Status is filtered in JS with the shared predicates rather than in SQL --
  // see the note in src/lib/status.ts. Matching exactly here meant finished
  // work stayed permanently "overdue" and got nudged about every night.
  const [overdueResult, staleResult] = await Promise.all([
    supabase
      .from("follow_ups")
      .select("due_date, status")
      .eq("company_id", orgId)
      .lt("due_date", sevenDaysAgo)
      .order("due_date"),
    supabase
      .from("jobs")
      .select("updated_at, status")
      .eq("company_id", orgId)
      .lt("updated_at", tenDaysAgo)
      .order("updated_at"),
  ]);

  const overdueFollowUps = (overdueResult.data ?? []).filter(
    (f) => isOpenFollowUp((f as { status: string | null }).status),
  );
  const staleJobs = (staleResult.data ?? []).filter((j) => {
    const s = (j as { status: string | null }).status;
    return !isCompleteWork(s) && !isCancelledWork(s);
  });
  const overdueFollowUpCount = overdueFollowUps.length;
  const staleJobCount = staleJobs.length;

  if (overdueFollowUpCount === 0 && staleJobCount === 0) return;

  // Compute max days overdue for the oldest record in each set
  const maxDaysOverdue =
    overdueFollowUps.length > 0
      ? Math.floor((now.getTime() - new Date(overdueFollowUps[0].due_date).getTime()) / 86400000)
      : 0;
  const maxStaleDays =
    staleJobs.length > 0
      ? Math.floor((now.getTime() - new Date(staleJobs[0].updated_at).getTime()) / 86400000)
      : 0;

  // Determine tone from the most overdue record across both sets
  const toneStage = getToneStage(Math.max(maxDaysOverdue, maxStaleDays));

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
  const systemPrompt = buildRecordNudgerPrompt(profile, toneStage);
  const userMessage = buildRecordNudgerUserMessage(
    shouldFireStale ? staleJobCount : 0,
    shouldFireOverdue ? overdueFollowUpCount : 0,
    profile,
    shouldFireOverdue ? maxDaysOverdue : undefined,
    shouldFireStale ? maxStaleDays : undefined,
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
    // Distinguished from "nothing needed nudging" below -- both used to
    // collapse into the same events_fired: 0 with no error recorded, which
    // is indistinguishable from an unremarkable quiet run.
    let parseError: string | null = null;

    try {
      const jsonData = JSON.parse(raw);
      const result = NudgerAlertSchema.safeParse(Array.isArray(jsonData) ? jsonData : jsonData.alerts ?? []);
      if (result.success) parsed = result.data;
      else parseError = result.error.message;
    } catch (err) {
      parseError = err instanceof Error ? err.message : "Invalid JSON response";
    }

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
      // Keyed by the same signal type(s) recordSignalFired writes below --
      // keying this by the LLM-authored alert.alert_type instead meant the
      // lookup almost never found the memory row, so escalation stuck at 0.
      // A single generated alert can mix both overdue/stale content, so use
      // the higher of the two firing signals' escalation levels.
      const [overdueEscalation, staleEscalation] = await Promise.all([
        shouldFireOverdue ? getEscalationLevel(orgId, "overdue_followups") : Promise.resolve(0 as const),
        shouldFireStale ? getEscalationLevel(orgId, "stale_jobs") : Promise.resolve(0 as const),
      ]);
      const escalationLevel = Math.max(overdueEscalation, staleEscalation) as 0 | 1 | 2;

      const alertInserts = (
        await Promise.all(
          parsed.map(async (alert) => {
            if (await hasRecentAlert(orgId, alert.alert_type, null)) return null;
            return {
              organization_id: orgId,
              alert_type: normalizeAlertType(alert.alert_type),
              severity: alert.severity,
              title: alert.title,
              body: alert.body,
              reasoning: alert.reasoning ?? null,
              escalation_level: escalationLevel,
            };
          }),
        )
      ).filter((a) => a !== null);
      if (alertInserts.length > 0) {
        await supabase.from("agent_alerts").insert(alertInserts);
      }
    }

    await Promise.all([
      shouldFireOverdue && recordSignalFired(orgId, "overdue_followups"),
      shouldFireStale && recordSignalFired(orgId, "stale_jobs"),
    ]);

    await supabase.from("agent_logs").insert({
      organization_id: orgId,
      agent_name: "record-nudger",
      events_fired: parsed?.length ?? 0,
      error: parseError,
    });
  } finally {
    await flushLangfuse();
  }
}
