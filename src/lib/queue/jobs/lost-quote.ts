import type { SupabaseClient } from "@supabase/supabase-js";
import { getAutomationQueue, JOB_LOST_QUOTE_SMS, DEFAULT_JOB_OPTIONS } from "@/lib/queue/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export type LostQuoteEmailJobData = {
  organizationId: string;
  companyId: string;
  quoteId: string;       // external Jobber quote ID
  customerId?: string;   // master_customers.id
  customerName?: string;
  quoteAmount?: number;
};

export type LostQuoteSmsJobData = LostQuoteEmailJobData;

// ── Day 7 — Email with seasonal promotion ─────────────────────────────────────

export async function processLostQuoteEmail(
  data: LostQuoteEmailJobData,
  supabase: SupabaseClient,
): Promise<{ sent: boolean; reason?: string }> {
  const { organizationId, companyId, customerId } = data;

  // Verify the quote is still unconverted — if a job was created for this
  // customer after the quote was lost, do not send.
  const converted = await checkIfConverted(supabase, companyId, customerId);
  if (converted) {
    return { sent: false, reason: "Quote was converted to a job — skipping Day 7 email." };
  }

  const customer = await lookUpCustomer(supabase, organizationId, customerId);
  if (!customer?.primary_email) {
    return { sent: false, reason: "No email address on file for this customer." };
  }

  const name = (data.customerName ?? [customer.first_name, customer.last_name].filter(Boolean).join(" ")) || "there";
  const amount = data.quoteAmount;
  const subject = "We'd love to win back your business";
  const body = [
    `Hi ${name},`,
    "",
    "We noticed your recent quote with us didn't move forward, and we completely understand.",
    "",
    amount
      ? `To make it easier, we're offering a seasonal discount on your original estimate of $${Number(amount).toFixed(2)}.`
      : "To make it easier, we're offering a seasonal discount — reach out and we'll apply it to your quote.",
    "",
    "Just reply to this email or give us a call and we'll take care of you.",
    "",
    "Thank you for considering us.",
  ].join("\n");

  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const fromEmail = process.env.MAILGUN_FROM_EMAIL ?? `noreply@${domain}`;

  if (!apiKey || !domain) {
    throw new Error("Missing Mailgun env vars — cannot dispatch Day 7 email.");
  }

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
    },
    body: new URLSearchParams({ from: fromEmail, to: customer.primary_email, subject, text: body }),
  });

  const result = (await response.json()) as { id?: string; message?: string };

  if (!response.ok) {
    throw new Error(`Mailgun email failed: ${result.message ?? "unknown error"}`);
  }

  // Log to communications_log.
  await supabase.from("communications_log").insert({
    organization_id: organizationId,
    customer_id: customer.id,
    direction: "outbound",
    channel: "email",
    to_address: customer.primary_email,
    subject,
    payload: body,
    status: "sent",
    provider_message_id: result.id ?? null,
  });

  // Enqueue the Day 14 SMS follow-up — fires 7 more days from now.
  const queue = getAutomationQueue();
  await queue.add(
    JOB_LOST_QUOTE_SMS,
    { ...data } satisfies LostQuoteSmsJobData,
    { ...DEFAULT_JOB_OPTIONS, delay: 7 * DAY_MS },
  );

  return { sent: true };
}

// ── Day 14 — SMS check-in if no conversion ────────────────────────────────────

export async function processLostQuoteSms(
  data: LostQuoteSmsJobData,
  supabase: SupabaseClient,
): Promise<{ sent: boolean; reason?: string }> {
  const { organizationId, companyId, customerId } = data;

  const converted = await checkIfConverted(supabase, companyId, customerId);
  if (converted) {
    return { sent: false, reason: "Quote was converted to a job — skipping Day 14 SMS." };
  }

  const customer = await lookUpCustomer(supabase, organizationId, customerId);
  if (!customer?.primary_phone) {
    return { sent: false, reason: "No phone number on file for this customer." };
  }

  const name = (data.customerName ?? [customer.first_name, customer.last_name].filter(Boolean).join(" ")) || "there";
  const messageBody = `Hi ${name}, just checking in! We'd love to help with your project. Reply here or give us a call — we're happy to revisit your quote.`;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Missing Twilio env vars — cannot dispatch Day 14 SMS.");
  }

  const toNumber = customer.primary_phone.startsWith("+")
    ? customer.primary_phone
    : `+1${customer.primary_phone.replace(/\D/g, "")}`;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toNumber, From: fromNumber, Body: messageBody }),
    },
  );

  const result = (await response.json()) as { sid?: string; message?: string };

  if (!response.ok) {
    throw new Error(`Twilio SMS failed: ${result.message ?? "unknown error"}`);
  }

  await supabase.from("communications_log").insert({
    organization_id: organizationId,
    customer_id: customer.id,
    direction: "outbound",
    channel: "sms",
    to_address: toNumber,
    payload: messageBody,
    status: "sent",
    provider_message_id: result.sid ?? null,
  });

  return { sent: true };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function lookUpCustomer(
  supabase: SupabaseClient,
  organizationId: string,
  customerId?: string,
) {
  if (!customerId) return null;
  const { data } = await supabase
    .from("master_customers")
    .select("id, primary_phone, primary_email, first_name, last_name")
    .eq("organization_id", organizationId)
    .eq("id", customerId)
    .maybeSingle();
  return data;
}

async function checkIfConverted(
  supabase: SupabaseClient,
  companyId: string,
  customerId?: string,
): Promise<boolean> {
  if (!customerId) return false;

  // A "conversion" means a new job was created for this customer after
  // the quote was lost. We check for any job created within the last 21 days.
  const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .gte("created_at", since);

  return (count ?? 0) > 0;
}
