/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { isAutopilot } from "@/lib/feature-gates";
import { buildOutreachPrompt, buildOutreachUserMessage } from "@/lib/ai/prompts";
import { logGeneration } from "@/lib/observability/tracing";
import type { TraceContext } from "@/lib/observability/tracing";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { getMemory, recordSignalFired, getEscalationLevel, hoursSince } from "@/lib/agents/memory";

const OutreachDraftSchema = z.object({
  draft_type: z.enum(["outreach_email", "outreach_sms"]),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(2000),
  reasoning: z.string().max(300).optional(),
});

type OutreachPayload = Record<string, unknown>;

const OUTREACH_COOLDOWN_HOURS = 7 * 24; // 7 days

export async function runOutreachWorker(
  payload: OutreachPayload,
  company: { id: string; name: string; preferences?: Record<string, unknown> },
  supabase: SupabaseClient,
  profile: IndustryProfile,
  ctx: TraceContext,
): Promise<void> {
  const customerId = payload.customer_id as string | undefined;

  // Memory guard
  if (customerId) {
    const mem = await getMemory(company.id, "outreach", customerId);
    if (mem) {
      // Permanently deprioritize contacts dismissed 3+ times with no approval
      if (mem.fire_count >= 3 && mem.last_outcome === "rejected") {
        return;
      }
      // Normal cooldown: don't re-fire within 7 days regardless of outcome
      if (hoursSince(mem.last_fired_at) < OUTREACH_COOLDOWN_HOURS) {
        return;
      }
    }
  }

  const escalationLevel = await getEscalationLevel(company.id, "outreach", customerId);

  let activityBlock = "";
  if (customerId) {
    const { data: recentActivity } = await (supabase as any)
      .from("contact_activity")
      .select("event_label, event_detail, created_at")
      .eq("contact_id", customerId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (recentActivity?.length) {
      activityBlock = `Recent contact activity:\n${recentActivity
        .map((e: { event_label: string; event_detail?: string; created_at: string }) =>
          `- ${e.event_label}${e.event_detail ? `: ${e.event_detail}` : ""} (${new Date(e.created_at).toLocaleDateString()})`
        ).join("\n")}`;
    }
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: thread } = await (supabase as any)
      .from("communications")
      .select("id")
      .eq("organization_id", company.id)
      .eq("contact_id", customerId)
      .maybeSingle();
    if (thread) {
      const { data: latestMsg } = await (supabase as any)
        .from("communication_messages")
        .select("direction, sent_at")
        .eq("communication_id", thread.id)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestMsg?.direction === "inbound" && new Date(latestMsg.sent_at) > new Date(sevenDaysAgo)) {
        await supabase.from("agent_alerts").insert({
          organization_id: company.id,
          alert_type: "unanswered_reply",
          title: "Unanswered reply",
          body: `${String(payload.customer_name ?? "A contact")} replied but hasn't received a response.`,
          severity: "warning",
          escalation_level: 0,
        });
        return;
      }
    }
  }

  const start = Date.now();
  const systemPrompt = buildOutreachPrompt(profile);

  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.outreach,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildOutreachUserMessage(payload, activityBlock) },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = OutreachDraftSchema.safeParse(JSON.parse(raw));

  logGeneration(ctx, {
    name: "outreach-draft",
    model: AI_MODELS.outreach,
    prompt: systemPrompt,
    completion: raw,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - start,
    zodPassed: parsed.success,
    error: parsed.success ? undefined : parsed.error.message,
  });

  if (!parsed.success) return;

  const draft = parsed.data;
  const recipientInfo = {
    customer_id: payload.customer_id ?? "",
    customer_name: payload.customer_name ?? "",
  };

  if (isAutopilot(company)) {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const from = process.env.MAILGUN_FROM_EMAIL ?? `noreply@${domain}`;
    const to = (payload as { email?: string }).email;

    if (draft.draft_type === "outreach_email" && apiKey && domain && to) {
      const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          from,
          to,
          subject: draft.subject ?? "Checking in",
          text: draft.body,
        }),
      });
      if (!res.ok) return;
    }

    await supabase.from("agent_logs").insert({
      organization_id: company.id,
      agent_name: "outreach-worker",
      events_fired: 1,
      autopilot: true,
    });
    if (customerId) {
      await recordSignalFired(company.id, "outreach", customerId);
    }
    return;
  }

  await supabase.from("agent_drafts").insert({
    organization_id: company.id,
    draft_type: draft.draft_type,
    subject: draft.subject ?? null,
    body: draft.body,
    recipient_info: recipientInfo,
    action_label: draft.draft_type === "outreach_email" ? "Send email" : "Send SMS",
    approve_action: draft.draft_type === "outreach_email" ? "send_email" : "send_sms",
    approve_args: recipientInfo,
    reasoning: draft.reasoning ?? null,
    signal_type: "outreach",
    escalation_level: escalationLevel,
  });

  if (customerId) {
    await recordSignalFired(company.id, "outreach", customerId);
  }
}
