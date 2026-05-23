import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { isAutopilot } from "@/lib/feature-gates";

const OutreachDraftSchema = z.object({
  draft_type: z.enum(["outreach_email", "outreach_sms"]),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(2000),
  recipient_info: z.record(z.string(), z.unknown()).optional().default({}),
});

type OutreachPayload = {
  customer_id?: string;
  customer_name?: string;
  last_interaction?: string;
  reason?: string;
  industry_tone?: string;
};

export async function runOutreachWorker(
  payload: OutreachPayload,
  company: { id: string; name: string; preferences?: Record<string, unknown> },
  supabase: SupabaseClient,
): Promise<void> {
  const prompt = `You are drafting a professional outreach message for a ${company.name} customer.

Customer: ${payload.customer_name ?? "valued customer"}
Last interaction: ${payload.last_interaction ?? "unknown"}
Reason for outreach: ${payload.reason ?? "re-engagement"}
Tone: ${payload.industry_tone ?? "professional and friendly"}

Write a short, personalized outreach message (2-3 sentences). Decide if email or SMS is more appropriate based on message length and tone.

Respond with ONLY valid JSON:
{
  "draft_type": "outreach_email" | "outreach_sms",
  "subject": "email subject line (omit for SMS)",
  "body": "the message body",
  "recipient_info": { "customer_id": "${payload.customer_id ?? ""}", "customer_name": "${payload.customer_name ?? ""}" }
}`;

  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.outreach,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = OutreachDraftSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) return;

  const draft = parsed.data;

  if (isAutopilot(company)) {
    // Autopilot: fire communication directly
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const from = process.env.MAILGUN_FROM_EMAIL ?? `noreply@${domain}`;
    const to = (draft.recipient_info as { email?: string })?.email;

    if (draft.draft_type === "outreach_email" && apiKey && domain && to) {
      await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
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
    }

    await supabase.from("agent_logs").insert({
      organization_id: company.id,
      agent_name: "outreach-worker",
      events_fired: 1,
      autopilot: true,
    });
    return;
  }

  // Co-Pilot: write to agent_drafts
  await supabase.from("agent_drafts").insert({
    organization_id: company.id,
    draft_type: draft.draft_type,
    subject: draft.subject ?? null,
    body: draft.body,
    recipient_info: draft.recipient_info,
    action_label: draft.draft_type === "outreach_email" ? "Send email" : "Send SMS",
    approve_action: draft.draft_type === "outreach_email" ? "send_email" : "send_sms",
    approve_args: draft.recipient_info,
  });
}
