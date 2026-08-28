/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { setOrgScope } from "@/lib/supabase/org-scope";
import { normalizeEmail } from "@/lib/normalize";

export const runtime = "nodejs";

// Inbound email, via Resend's webhooks-based receiving feature. The
// predecessor to this (the Mailgun webhook) only ever wrote to
// communications_log, a write-only legacy table nothing reads -- so an
// inbound email has never once appeared in the actual Communications inbox,
// despite the UI having a dedicated (and, until now, dead) code path for
// "this is an email thread". This webhook writes to communications +
// communication_messages instead, the tables the inbox actually reads,
// mirroring the find-or-create-thread pattern the Twilio SMS webhook uses so
// an inbound-first and outbound-first (via api/communications/start)
// conversation with the same contact can never split into two threads.
export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;

  if (!webhookSecret || !apiKey) {
    console.error("[resend.webhook] Missing RESEND_WEBHOOK_SECRET or RESEND_API_KEY");
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  // Signature verification needs the raw body -- parsing to JSON first
  // breaks it, same requirement as the Twilio/Mailgun webhooks.
  const rawBody = await request.text();
  const resend = new Resend(apiKey);

  let event;
  try {
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    });
  } catch {
    console.warn("[resend.webhook] Signature validation failed");
    return NextResponse.json(
      { error: "Webhook Security Validation Failed: Unauthorized Signature Forgery." },
      { status: 401 },
    );
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ received: true });
  }

  const { email_id: emailId, from: fromRaw } = event.data;
  const senderEmail = normalizeEmail(fromRaw.replace(/.*<(.+)>/, "$1").trim() || fromRaw);
  if (!senderEmail) {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  // Look up master customer by email -- same "which business does this
  // belong to" resolution the Twilio webhook does by phone.
  const { data: customer } = await supabase
    .from("master_customers")
    .select("id, organization_id")
    .eq("primary_email", senderEmail)
    .limit(1)
    .maybeSingle();

  if (!customer) {
    console.info("[resend.webhook] Unmatched email, ignored", { from: senderEmail });
    return NextResponse.json({ received: true });
  }

  const orgId = customer.organization_id as string;
  const contactId = customer.id as string;
  await setOrgScope(supabase, orgId);

  // The webhook payload is metadata only (Resend's Inbound design) -- the
  // body has to be fetched separately.
  const { data: fullEmail } = await resend.emails.receiving.get(emailId);
  const bodyText = fullEmail?.text ?? "";

  const { data: existingThread } = await (supabase as any)
    .from("communications")
    .select("id, unread_count")
    .eq("organization_id", orgId)
    .eq("contact_id", contactId)
    .eq("channel", "email")
    .maybeSingle();

  let threadId: string;
  let currentUnread = 0;
  if (existingThread) {
    threadId = existingThread.id;
    currentUnread = existingThread.unread_count ?? 0;
  } else {
    const { data: newThread, error: threadError } = await (supabase as any)
      .from("communications")
      .insert({
        organization_id: orgId,
        contact_id: contactId,
        channel: "email",
        status: "open",
      })
      .select("id")
      .single();
    if (threadError || !newThread) {
      console.error("[resend.webhook] Could not create thread", threadError);
      return NextResponse.json({ received: true });
    }
    threadId = newThread.id;
  }

  const now = new Date().toISOString();
  await (supabase as any).from("communication_messages").insert({
    communication_id: threadId,
    organization_id: orgId,
    direction: "inbound",
    body: bodyText,
    status: "received",
    sent_at: now,
  });

  await (supabase as any)
    .from("communications")
    .update({
      last_message_at: now,
      last_message_preview: bodyText.slice(0, 100),
      unread_count: currentUnread + 1,
    })
    .eq("id", threadId);

  return NextResponse.json({ received: true });
}
