import type { SupabaseClient } from "@supabase/supabase-js";
import { setOrgScope } from "@/lib/supabase/org-scope";

export type OverdueInvoiceJobData = {
  organizationId: string;
  companyId: string;
  invoiceId: string;       // external QB invoice ID
  customerId?: string;     // master_customers.id, if known at enqueue time
  customerName?: string;
  invoiceAmount?: number;
  paymentLink?: string;    // direct checkout URL if available
};

// Called by the worker at execution time (24 hours after the QB webhook fires).
// Re-checks the local sales table to confirm the invoice is still unpaid
// before dispatching the SMS — prevents messaging customers who paid overnight.
export async function processOverdueInvoice(
  data: OverdueInvoiceJobData,
  supabase: SupabaseClient,
): Promise<{ sent: boolean; reason?: string }> {
  const { organizationId, companyId, invoiceId, customerId } = data;

  await setOrgScope(supabase, organizationId);

  // Re-verify: is this invoice still unpaid in the local sales table?
  const { data: sale } = await supabase
    .from("sales")
    .select("id, payment_status, amount, customer_id")
    .eq("company_id", companyId)
    .or(`source.eq.quickbooks,service_type.ilike.%${invoiceId}%`)
    .in("payment_status", ["Unpaid", "unpaid", "Overdue", "overdue"])
    .maybeSingle();

  if (!sale) {
    return { sent: false, reason: "Invoice already paid or not found — skipping SMS." };
  }

  // Look up the customer in master_customers for contact details.
  const mcQuery = supabase
    .from("master_customers")
    .select("id, primary_phone, primary_email, first_name, last_name")
    .eq("organization_id", organizationId);

  const { data: customer } = customerId
    ? await mcQuery.eq("id", customerId).maybeSingle()
    : await mcQuery.eq("id", sale.customer_id ?? "").maybeSingle();

  if (!customer?.primary_phone) {
    return { sent: false, reason: "No phone number on file for this customer." };
  }

  const amount = data.invoiceAmount ?? (sale.amount as number | null) ?? 0;
  const name = (data.customerName ?? [customer.first_name, customer.last_name].filter(Boolean).join(" ")) || "there";
  const paymentLink = data.paymentLink ?? "";

  const messageBody = paymentLink
    ? `Hi ${name}, your invoice of $${Number(amount).toFixed(2)} is past due. Pay now: ${paymentLink}`
    : `Hi ${name}, your invoice of $${Number(amount).toFixed(2)} is past due. Please contact us to settle your balance.`;

  // Dispatch SMS via Twilio.
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Missing Twilio env vars — cannot dispatch overdue invoice SMS.");
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

  // Log to communications_log.
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
