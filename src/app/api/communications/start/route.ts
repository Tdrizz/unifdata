/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { normalizePhone } from "@/lib/crm/phone";
import { sendSms } from "@/lib/messaging/sms";
import { sendEmail } from "@/lib/messaging/email";
import { recordOutboundMessage } from "@/lib/messaging/record-outbound-message";
import { rateLimit } from "@/lib/rate-limit";

// Starts a new conversation (SMS or email) with a contact who doesn't have
// one yet -- the reply route (api/communications/[id]/send) only knows how
// to send into an existing thread, and until now nothing in the app ever
// created the first one. Reuses the same find-or-create pattern the inbound
// Twilio/Resend webhooks already use, so an outbound-first message and an
// inbound-first message land in the same thread: one per
// (org, contact, channel), never two.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "No company" }, { status: 403 });

  if (!await rateLimit(`messages:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many messages. Try again in a minute." }, { status: 429 });
  }

  const { company } = currentCompany;

  let body: { contact_id?: string; body?: string; channel?: string; subject?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const contactId = body.contact_id?.trim();
  const messageBody = body.body?.trim();
  const channel = body.channel === "email" ? "email" : "sms";
  if (!contactId) return NextResponse.json({ error: "A contact is required." }, { status: 400 });
  if (!messageBody) return NextResponse.json({ error: "Message body is required" }, { status: 400 });

  const { data: contact } = await (supabase as any)
    .from("master_customers")
    .select("id, first_name, last_name, primary_phone, primary_email")
    .eq("id", contactId)
    .eq("organization_id", company.id)
    .maybeSingle();

  if (!contact) return NextResponse.json({ error: "Contact not found." }, { status: 404 });

  if (channel === "sms" && !contact.primary_phone) {
    return NextResponse.json({ error: "This contact doesn't have a phone number on file." }, { status: 422 });
  }
  if (channel === "email" && !contact.primary_email) {
    return NextResponse.json({ error: "This contact doesn't have an email address on file." }, { status: 422 });
  }

  const normalizedPhone = contact.primary_phone ? normalizePhone(contact.primary_phone) : null;

  // Reuse an existing thread if one's already open with this contact on this
  // channel (e.g. they've texted/emailed in before) instead of creating a
  // second one -- the unique index on (organization_id, contact_id, channel)
  // would reject a duplicate insert anyway, but checking first gives a
  // normal reply instead of a 500.
  const { data: existingThread } = await (supabase as any)
    .from("communications")
    .select("id, contact_id, contact_phone, channel, unread_count, last_message_at, last_message_preview, status")
    .eq("organization_id", company.id)
    .eq("contact_id", contact.id)
    .eq("channel", channel)
    .maybeSingle();

  let thread = existingThread;
  if (!thread) {
    const { data: newThread, error: threadError } = await (supabase as any)
      .from("communications")
      .insert({
        organization_id: company.id,
        contact_id: contact.id,
        contact_phone: channel === "sms" ? normalizedPhone : null,
        channel,
        status: "open",
      })
      .select("id, contact_id, contact_phone, channel, unread_count, last_message_at, last_message_preview, status")
      .single();

    if (threadError || !newThread) {
      return NextResponse.json({ error: threadError?.message ?? "Could not start the conversation." }, { status: 500 });
    }
    thread = newThread;
  }

  try {
    if (channel === "sms") {
      await sendSms(thread.contact_phone ?? normalizedPhone, messageBody, company.name);
    } else {
      await sendEmail({
        to: contact.primary_email,
        subject: body.subject?.trim() || `Message from ${company.name}`,
        text: messageBody,
        companyName: company.name,
        fromLocalPart: company.email_slug,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : `${channel === "sms" ? "SMS" : "Email"} send failed`;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let message;
  try {
    message = await recordOutboundMessage(supabase, company.id, thread.id, contact.id, messageBody, channel);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Could not save the message.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  return NextResponse.json({
    thread: {
      ...thread,
      contact: { id: contact.id, first_name: contact.first_name, last_name: contact.last_name },
    },
    message,
  });
}
