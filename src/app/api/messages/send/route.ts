import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCompany } from "@/lib/current-company";
import { toE164 } from "@/lib/webhook-validation";
import { rateLimit } from "@/lib/rate-limit";
import { sendSms } from "@/lib/messaging/sms";
import { sendEmail } from "@/lib/messaging/email";

export const runtime = "nodejs";

type MessageType = "sms" | "email";

type SendMessageBody = {
  customer_id: string;
  message_type: MessageType;
  body: string;
  subject?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) {
    return NextResponse.json({ error: "No company context." }, { status: 401 });
  }
  const { company } = currentCompany;
  const companyId = company.id;

  if (!await rateLimit(`messages:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many messages. Try again in a minute." }, { status: 429 });
  }

  let body: SendMessageBody;
  try {
    body = (await request.json()) as SendMessageBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { customer_id, message_type, body: messageBody, subject = "" } = body;

  if (!customer_id || !message_type || !messageBody) {
    return NextResponse.json(
      { error: "Missing required fields: customer_id, message_type, body." },
      { status: 400 },
    );
  }

  if (message_type !== "sms" && message_type !== "email") {
    return NextResponse.json({ error: "message_type must be 'sms' or 'email'." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch customer — scoped to the authenticated company (prevents IDOR).
  const { data: customer, error: customerError } = await admin
    .from("master_customers")
    .select("id, primary_phone, primary_email, organization_id")
    .eq("id", customer_id)
    .eq("organization_id", companyId)
    .maybeSingle();

  if (customerError || !customer) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  let providerMessageId = "";

  try {
    if (message_type === "sms") {
      if (!customer.primary_phone) {
        return NextResponse.json({ error: "Customer has no phone number." }, { status: 422 });
      }
      const to = toE164(customer.primary_phone as string);
      providerMessageId = await sendSms(to, messageBody, company.name);
    } else {
      if (!customer.primary_email) {
        return NextResponse.json({ error: "Customer has no email address." }, { status: 422 });
      }
      providerMessageId = await sendEmail({
        to: customer.primary_email as string,
        subject: subject || "(no subject)",
        text: messageBody,
        companyName: company.name,
        fromLocalPart: company.email_slug,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed.";
    console.error("[messages.send] Dispatch failed", { message_type, customer_id, message });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Write to communications_log.
  const { error: logError } = await admin.from("communications_log").insert({
    organization_id: companyId,
    customer_id,
    direction: "outbound",
    channel: message_type,
    to_address: message_type === "sms"
      ? toE164(customer.primary_phone as string)
      : (customer.primary_email as string),
    subject: message_type === "email" ? subject || null : null,
    payload: messageBody,
    status: "sent",
    provider_message_id: providerMessageId || null,
  });

  if (logError) {
    console.error("[messages.send] Log write failed", logError);
  }

  return NextResponse.json({ success: true, provider_message_id: providerMessageId });
}
