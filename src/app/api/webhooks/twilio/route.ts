import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setOrgScope } from "@/lib/supabase/org-scope";
import { validateTwilioSignature, toE164, stripE164Plus } from "@/lib/webhook-validation";
import { checkAndDropEchoWebhook } from "@/lib/conflict-resolver";
import { normalizePhone } from "@/lib/crm/phone";
import { logActivity } from "@/lib/crm/activity";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const twilioSignature = request.headers.get("x-twilio-signature") ?? "";

  // Read raw body — must be done before any .json()/.formData() call.
  const rawBody = await request.text();

  // Parse as URLSearchParams (Twilio sends application/x-www-form-urlencoded).
  const params = Object.fromEntries(new URLSearchParams(rawBody).entries());

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!authToken || !appUrl) {
    console.error("[twilio.webhook] Missing TWILIO_AUTH_TOKEN or NEXT_PUBLIC_APP_URL");
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  // Validate Twilio signature.
  const webhookUrl = `${appUrl}/api/webhooks/twilio`;
  const isValid = validateTwilioSignature(authToken, webhookUrl, params, twilioSignature);

  if (!isValid) {
    console.warn("[twilio.webhook] Signature validation failed");
    return new Response("Webhook Security Validation Failed: Unauthorized Signature Forgery.", {
      status: 401,
    });
  }

  const fromRaw = params.From ?? "";
  const body = params.Body ?? "";
  const messageSid = params.MessageSid ?? "";

  if (!fromRaw) {
    return new Response(`<Response/>`, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const fromE164 = toE164(fromRaw);
  const fromDigits = stripE164Plus(fromE164);

  const supabase = createAdminClient();

  // Look up master customer by phone (exact match first, then digits-only).
  // Use separate .eq() queries to avoid filter-string injection on phone values.
  let customer: { id: string; organization_id: string } | null = null;
  const { data: byE164 } = await supabase
    .from("master_customers")
    .select("id, organization_id")
    .eq("primary_phone", fromE164)
    .limit(1)
    .maybeSingle();
  customer = byE164 ?? null;
  if (!customer) {
    const { data: byDigits } = await supabase
      .from("master_customers")
      .select("id, organization_id")
      .eq("primary_phone", fromDigits)
      .limit(1)
      .maybeSingle();
    customer = byDigits ?? null;
  }

  // Drop echo webhooks (messages we sent that bounced back).
  if (customer) {
    await setOrgScope(supabase, customer.organization_id as string);
    const isEcho = await checkAndDropEchoWebhook({
      supabase,
      organizationId: customer.organization_id as string,
      source: "quickbooks",
      providerCustomerId: fromDigits,
      incomingToken: messageSid,
    });
    if (isEcho) {
      return new Response(`<Response/>`, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }
  }

  // Write to communications_log (backwards compat).
  if (customer) {
    await supabase.from("communications_log").insert({
      organization_id: customer.organization_id,
      customer_id: customer.id,
      direction: "inbound",
      channel: "sms",
      from_address: fromE164,
      to_address: params.To ?? null,
      payload: body,
      status: "received",
      provider_message_id: messageSid,
    });
  } else {
    // Unknown sender — log without a customer link so nothing is silently dropped.
    console.info("[twilio.webhook] Unmatched phone, logged without customer link", { from: fromE164 });
  }

  // Write to new communications + communication_messages tables.
  const normalizedPhone = normalizePhone(fromRaw);
  const orgId = customer?.organization_id ?? null;

  if (orgId) {
    // Find or create communications thread
    const { data: existingThread } = await (supabase as any)
      .from("communications")
      .select("id")
      .eq("organization_id", orgId)
      .eq("contact_id", customer!.id)
      .eq("channel", "sms")
      .maybeSingle();

    let threadId: string;

    if (existingThread) {
      threadId = existingThread.id;
    } else {
      const { data: newThread } = await (supabase as any)
        .from("communications")
        .insert({
          organization_id: orgId,
          contact_id: customer!.id,
          contact_phone: normalizedPhone,
          channel: "sms",
          status: "open",
        })
        .select("id")
        .single();
      threadId = newThread?.id;
    }

    if (threadId) {
      const now = new Date().toISOString();

      // Insert inbound message
      await (supabase as any).from("communication_messages").insert({
        communication_id: threadId,
        organization_id: orgId,
        direction: "inbound",
        body,
        status: "received",
        twilio_sid: messageSid || null,
        sent_at: now,
      });

      // Update thread metadata
      await (supabase as any)
        .from("communications")
        .update({
          last_message_at: now,
          last_message_preview: body.slice(0, 100),
          unread_count: (supabase as any).rpc
            ? undefined // avoid rpc here, just increment with a follow-up
            : undefined,
        })
        .eq("id", threadId);

      // Increment unread count separately
      await (supabase as any).rpc("increment_unread", { thread_id: threadId }).catch(() => {
        // If RPC doesn't exist, do a manual fetch+update
        (supabase as any)
          .from("communications")
          .select("unread_count")
          .eq("id", threadId)
          .maybeSingle()
          .then(({ data }: { data: { unread_count: number } | null }) => {
            if (data) {
              (supabase as any)
                .from("communications")
                .update({ unread_count: (data.unread_count ?? 0) + 1 })
                .eq("id", threadId);
            }
          });
      });

      // Log activity on the contact
      try {
        await logActivity(supabase, orgId, customer!.id, {
          type: "message_received",
          label: "SMS received",
          detail: body.slice(0, 100),
          referenceId: threadId,
          referenceType: "communication",
          source: "integration",
        });
      } catch {
        // Non-fatal
      }
    }
  }

  // Return empty TwiML — we don't auto-reply.
  return new Response(`<Response/>`, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
