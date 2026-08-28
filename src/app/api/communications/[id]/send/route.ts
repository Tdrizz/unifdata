/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { sendSms } from "@/lib/messaging/sms";
import { sendEmail } from "@/lib/messaging/email";
import { recordOutboundMessage } from "@/lib/messaging/record-outbound-message";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "No company" }, { status: 403 });

  if (!await rateLimit(`messages:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many messages. Try again in a minute." }, { status: 429 });
  }

  const { company } = currentCompany;

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  }

  // Fetch the thread and verify org
  const { data: thread } = await (supabase as any)
    .from("communications")
    .select("id, organization_id, contact_id, contact_phone, channel")
    .eq("id", threadId)
    .eq("organization_id", company.id)
    .maybeSingle();

  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const messageBody = body.body.trim();
  const channel = thread.channel === "email" ? "email" : "sms";

  if (channel === "sms") {
    if (!thread.contact_phone) {
      return NextResponse.json({ error: "Thread has no phone number" }, { status: 422 });
    }
    try {
      await sendSms(thread.contact_phone, messageBody, company.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "SMS send failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } else {
    // No contact_email column on the thread (only contact_phone is
    // denormalized onto it) -- look the current address up from the linked
    // contact instead of adding a migration for it.
    let toEmail: string | null = null;
    if (thread.contact_id) {
      const { data: contact } = await (supabase as any)
        .from("master_customers")
        .select("primary_email")
        .eq("id", thread.contact_id)
        .eq("organization_id", company.id)
        .maybeSingle();
      toEmail = contact?.primary_email ?? null;
    }
    if (!toEmail) {
      return NextResponse.json({ error: "This contact doesn't have an email address on file." }, { status: 422 });
    }
    try {
      await sendEmail({ to: toEmail, subject: `Message from ${company.name}`, text: messageBody, companyName: company.name, fromLocalPart: company.email_slug });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email send failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  let message;
  try {
    message = await recordOutboundMessage(supabase, company.id, threadId, thread.contact_id, messageBody, channel);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Could not save the message.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  return NextResponse.json(message);
}
