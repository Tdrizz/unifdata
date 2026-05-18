import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setOrgScope } from "@/lib/supabase/org-scope";
import { validateTwilioSignature, toE164, stripE164Plus } from "@/lib/webhook-validation";
import { checkAndDropEchoWebhook } from "@/lib/conflict-resolver";

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
  const { data: customer } = await supabase
    .from("master_customers")
    .select("id, organization_id")
    .or(`primary_phone.eq.${fromE164},primary_phone.eq.${fromDigits}`)
    .limit(1)
    .maybeSingle();

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

  // Write to communications_log.
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

  // Return empty TwiML — we don't auto-reply.
  return new Response(`<Response/>`, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
