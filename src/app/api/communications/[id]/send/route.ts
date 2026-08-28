/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { sendSms } from "@/lib/messaging/sms";
import { recordOutboundSms } from "@/lib/messaging/record-outbound-sms";
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

  if (thread.channel !== "sms") {
    return NextResponse.json({ error: "Only SMS threads are supported" }, { status: 422 });
  }

  if (!thread.contact_phone) {
    return NextResponse.json({ error: "Thread has no phone number" }, { status: 422 });
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    return NextResponse.json({ error: "SMS is not configured. Add Twilio credentials in settings." }, { status: 503 });
  }

  try {
    await sendSms(thread.contact_phone, messageBody, company.name);
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMS send failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let message;
  try {
    message = await recordOutboundSms(supabase, company.id, threadId, thread.contact_id, messageBody);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Could not save the message.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  return NextResponse.json(message);
}
