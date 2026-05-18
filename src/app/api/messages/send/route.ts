import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/webhook-validation";

export const runtime = "nodejs";

type MessageType = "sms" | "email";

type SendMessageBody = {
  customer_id: string;
  organization_id: string;
  message_type: MessageType;
  body: string;
  subject?: string;
};

async function sendSms(to: string, body: string): Promise<string> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Missing Twilio environment variables.");
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: body }),
    },
  );

  const data = (await response.json()) as { sid?: string; message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? "Twilio send failed.");
  }

  return data.sid ?? "";
}

async function sendEmail(to: string, subject: string, body: string): Promise<string> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const fromEmail = process.env.MAILGUN_FROM_EMAIL ?? `noreply@${domain}`;

  if (!apiKey || !domain) {
    throw new Error("Missing Mailgun environment variables.");
  }

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      from: fromEmail,
      to,
      subject: subject || "(no subject)",
      text: body,
    }),
  });

  const data = (await response.json()) as { id?: string; message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? "Mailgun send failed.");
  }

  return data.id ?? "";
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: SendMessageBody;
  try {
    body = (await request.json()) as SendMessageBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { customer_id, organization_id, message_type, body: messageBody, subject = "" } = body;

  if (!customer_id || !organization_id || !message_type || !messageBody) {
    return NextResponse.json(
      { error: "Missing required fields: customer_id, organization_id, message_type, body." },
      { status: 400 },
    );
  }

  if (message_type !== "sms" && message_type !== "email") {
    return NextResponse.json({ error: "message_type must be 'sms' or 'email'." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch customer contact details.
  const { data: customer, error: customerError } = await supabase
    .from("master_customers")
    .select("id, primary_phone, primary_email, organization_id")
    .eq("id", customer_id)
    .eq("organization_id", organization_id)
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
      providerMessageId = await sendSms(to, messageBody);
    } else {
      if (!customer.primary_email) {
        return NextResponse.json({ error: "Customer has no email address." }, { status: 422 });
      }
      providerMessageId = await sendEmail(customer.primary_email as string, subject, messageBody);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed.";
    console.error("[messages.send] Dispatch failed", { message_type, customer_id, message });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Write to communications_log.
  const { error: logError } = await supabase.from("communications_log").insert({
    organization_id,
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
