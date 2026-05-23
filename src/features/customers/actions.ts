"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString } from "@/lib/utils";
import { toE164 } from "@/lib/webhook-validation";
import { rateLimit } from "@/lib/rate-limit";
import { syncEmbedding } from "@/lib/embeddings/sync";
import { buildCustomerText } from "@/lib/embeddings/generate";

export type ActionState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function createCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const name = getFormString(formData, "name");
  if (!name) return { fieldErrors: { name: "Name is required." } };

  const email = getFormString(formData, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { fieldErrors: { email: "Enter a valid email address." } };
  }

  const customerType = getFormString(formData, "customer_type") || null;
  const address = getFormString(formData, "address") || null;
  const notes = getFormString(formData, "notes") || null;

  const { data: inserted, error } = await supabase
    .from("customers")
    .insert({
      company_id: company.id,
      name,
      phone: getFormString(formData, "phone") || null,
      email: email || null,
      address,
      customer_type: customerType,
      notes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (inserted) {
    syncEmbedding(
      "customers",
      inserted.id,
      buildCustomerText({ name, customer_type: customerType, address, notes }),
      company.id,
    );
  }

  revalidatePath("/customers");
  revalidatePath("/workspace");
  redirect("/customers?toast=Customer+created");
}

export async function updateCustomerAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const name = getFormString(formData, "name");
  if (!name) return { fieldErrors: { name: "Name is required." } };

  const email = getFormString(formData, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { fieldErrors: { email: "Enter a valid email address." } };
  }

  const customerType = getFormString(formData, "customer_type") || null;
  const address = getFormString(formData, "address") || null;
  const notes = getFormString(formData, "notes") || null;

  const { error } = await supabase
    .from("customers")
    .update({
      name,
      phone: getFormString(formData, "phone") || null,
      email: email || null,
      address,
      customer_type: customerType,
      notes,
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) return { error: error.message };

  syncEmbedding(
    "customers",
    id,
    buildCustomerText({ name, customer_type: customerType, address, notes }),
    company.id,
  );

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  revalidatePath(`/customers/${id}/edit`);
  revalidatePath("/workspace");
  redirect("/customers?toast=Customer+updated");
}

export async function bulkDeleteCustomers(ids: string[]): Promise<ActionState> {
  if (ids.length === 0) return null;
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return { error: "Unauthorized" };
  if (currentCompany.role !== "owner") return { error: "Only owners can delete customers" };
  const { company } = currentCompany;

  const { error } = await supabase
    .from("customers")
    .delete()
    .in("id", ids)
    .eq("company_id", company.id);

  if (error) return { error: error.message };
  revalidatePath("/customers");
  revalidatePath("/workspace");
  return null;
}

export async function mergeCustomers(winnerId: string, loserId: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");
  if (currentCompany.role !== "owner") throw new Error("Only owners can merge customers");
  const { company } = currentCompany;

  // Security: verify both customers belong to this company
  const { data: customers, error: fetchError } = await supabase
    .from("customers")
    .select("id, company_id")
    .in("id", [winnerId, loserId])
    .eq("company_id", company.id);

  if (fetchError || !customers || customers.length !== 2) {
    throw new Error("Invalid customer IDs or access denied");
  }

  // Re-parent all related records from loser to winner
  const tables = ["leads", "jobs", "follow_ups", "sales"] as const;
  for (const table of tables) {
    const { error: updateError } = await supabase
      .from(table as never)
      .update({ customer_id: winnerId, updated_at: new Date().toISOString() } as never)
      .eq("customer_id" as never, loserId)
      .eq("company_id" as never, company.id);
    if (updateError) throw new Error(`Failed to re-parent ${table}: ${updateError.message}`);
  }

  // Delete the loser — company_id guard prevents cross-tenant deletion
  const { error: deleteError } = await supabase
    .from("customers")
    .delete()
    .eq("id", loserId)
    .eq("company_id", company.id);
  if (deleteError) throw new Error(`Failed to delete merged customer: ${deleteError.message}`);

  // Touch winner's updated_at
  await supabase
    .from("customers")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", winnerId);

  revalidatePath("/customers");
}

export type SendMessageState = { ok: true } | { error: string } | null;

export async function sendCustomerMessageAction(
  customerId: string,
  messageType: "sms" | "email",
  body: string,
  subject: string,
): Promise<SendMessageState> {
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return { error: "Unauthorized." };
  const { company } = currentCompany;

  if (!await rateLimit(`messages:${company.id}`, 20)) {
    return { error: "Too many messages. Try again in a minute." };
  }

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, email")
    .eq("id", customerId)
    .eq("company_id", company.id)
    .maybeSingle();

  if (!customer) return { error: "Customer not found." };

  const admin = createAdminClient();
  let providerMessageId = "";

  try {
    if (messageType === "sms") {
      if (!customer.phone) return { error: "This customer has no phone number." };
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;
      if (!accountSid || !authToken || !fromNumber) return { error: "SMS is not configured. Add Twilio credentials in settings." };

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: toE164(customer.phone), From: fromNumber, Body: body }),
        },
      );
      const data = (await res.json()) as { sid?: string; message?: string };
      if (!res.ok) return { error: data.message ?? "SMS send failed." };
      providerMessageId = data.sid ?? "";
    } else {
      if (!customer.email) return { error: "This customer has no email address." };
      const apiKey = process.env.MAILGUN_API_KEY;
      const domain = process.env.MAILGUN_DOMAIN;
      const fromEmail = process.env.MAILGUN_FROM_EMAIL ?? (domain ? `noreply@${domain}` : undefined);
      if (!apiKey || !domain) return { error: "Email is not configured. Add Mailgun credentials in settings." };

      const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}` },
        body: new URLSearchParams({ from: fromEmail ?? `noreply@${domain}`, to: customer.email, subject: subject || "(no subject)", text: body }),
      });
      const data = (await res.json()) as { id?: string; message?: string };
      if (!res.ok) return { error: data.message ?? "Email send failed." };
      providerMessageId = data.id ?? "";
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Send failed." };
  }

  await admin.from("communications_log").insert({
    organization_id: company.id,
    customer_id: customerId,
    direction: "outbound",
    channel: messageType,
    to_address: messageType === "sms" ? toE164(customer.phone!) : customer.email!,
    subject: messageType === "email" ? subject || null : null,
    payload: body,
    status: "sent",
    provider_message_id: providerMessageId || null,
  });

  return { ok: true };
}

export async function deleteCustomerAction(id: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/customers/${id}/edit?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/customers");
  revalidatePath("/workspace");
  redirect("/customers?toast=Customer+deleted");
}
