/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { logActivity } from "@/lib/crm/activity";

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
  const now = new Date().toISOString();

  // TODO: wire Twilio — call Twilio API to actually send the SMS
  // const twilio = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await twilio.messages.create({ body: messageBody, from: process.env.TWILIO_FROM_NUMBER, to: thread.contact_phone });

  // Insert outbound message
  const { data: message, error } = await (supabase as any)
    .from("communication_messages")
    .insert({
      communication_id: threadId,
      organization_id: company.id,
      direction: "outbound",
      body: messageBody,
      status: "sent",
      sent_at: now,
    })
    .select("id, communication_id, direction, body, status, sent_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update thread metadata
  await (supabase as any)
    .from("communications")
    .update({
      last_message_at: now,
      last_message_preview: messageBody.slice(0, 100),
    })
    .eq("id", threadId);

  // Log activity if contact is known
  if (thread.contact_id) {
    try {
      await logActivity(supabase, company.id, thread.contact_id, {
        type: "message_sent",
        label: "SMS sent",
        detail: messageBody.slice(0, 100),
        referenceId: message.id,
        referenceType: "communication_message",
        source: "user",
      });
    } catch {
      // Non-fatal
    }
  }

  return NextResponse.json(message);
}
