import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setOrgScope } from "@/lib/supabase/org-scope";
import { validateMailgunSignature } from "@/lib/webhook-validation";
import { normalizeEmail } from "@/lib/normalize";

export const runtime = "nodejs";

type MailgunPayload = {
  signature?: {
    timestamp?: string;
    token?: string;
    signature?: string;
  };
  "event-data"?: {
    event?: string;
    message?: {
      headers?: {
        "message-id"?: string;
        from?: string;
        to?: string;
        subject?: string;
      };
    };
    recipient?: string;
    sender?: string;
    subject?: string;
    "body-plain"?: string;
    "stripped-text"?: string;
  };
};

export async function POST(request: Request) {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

  if (!signingKey) {
    console.error("[mailgun.webhook] Missing MAILGUN_WEBHOOK_SIGNING_KEY");
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  let payload: MailgunPayload;
  try {
    payload = (await request.json()) as MailgunPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { timestamp = "", token = "", signature = "" } = payload.signature ?? {};

  const isValid = validateMailgunSignature(signingKey, timestamp, token, signature);
  if (!isValid) {
    console.warn("[mailgun.webhook] Signature validation failed");
    return NextResponse.json(
      { error: "Webhook Security Validation Failed: Unauthorized Signature Forgery." },
      { status: 401 },
    );
  }

  const eventData = payload["event-data"];
  if (!eventData) {
    return NextResponse.json({ received: true });
  }

  const senderRaw = eventData.sender ?? eventData.message?.headers?.from ?? "";
  const senderEmail = normalizeEmail(senderRaw.replace(/.*<(.+)>/, "$1").trim() || senderRaw);
  const bodyText = eventData["stripped-text"] ?? eventData["body-plain"] ?? "";
  const subject = eventData.subject ?? eventData.message?.headers?.subject ?? "";
  const messageId = eventData.message?.headers?.["message-id"] ?? "";
  const toAddress = eventData.recipient ?? eventData.message?.headers?.to ?? "";

  if (!senderEmail) {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  // Look up master customer by email.
  const { data: customer } = await supabase
    .from("master_customers")
    .select("id, organization_id")
    .eq("primary_email", senderEmail)
    .limit(1)
    .maybeSingle();

  if (customer) {
    await setOrgScope(supabase, customer.organization_id as string);
    await supabase.from("communications_log").insert({
      organization_id: customer.organization_id,
      customer_id: customer.id,
      direction: "inbound",
      channel: "email",
      from_address: senderEmail,
      to_address: toAddress,
      subject: subject || null,
      payload: bodyText,
      status: "received",
      provider_message_id: messageId || null,
    });
  } else {
    console.info("[mailgun.webhook] Unmatched email, logged without customer link", { from: senderEmail });
  }

  return NextResponse.json({ received: true });
}
