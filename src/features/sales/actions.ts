"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString, getOptionalNumber } from "@/lib/utils";
import { getTodayString } from "@/lib/date-format";
import { logActivity } from "@/lib/crm/activity";
import { resolveOwnedContactId } from "@/lib/crm/contacts";
import { syncEmbedding } from "@/lib/embeddings/sync";
import { buildSaleText } from "@/lib/embeddings/generate";

export type ActionState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function createSaleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const amount = getOptionalNumber(formData, "amount");
  const paymentStatus = getFormString(formData, "payment_status") || "Paid";
  const saleDate = getFormString(formData, "sale_date") || getTodayString();
  const serviceType = getFormString(formData, "service_type");
  const source = getFormString(formData, "source");
  const contactId = await resolveOwnedContactId(supabase, company.id, getFormString(formData, "contact_id"));

  if (amount === null) {
    return { fieldErrors: { amount: "Revenue amount is required." } };
  }

  if (amount < 0) {
    return { fieldErrors: { amount: "Must be a positive number." } };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any)
    .from("sales")
    .insert({
      company_id: company.id,
      contact_id: contactId || null,
      amount,
      payment_status: paymentStatus,
      sale_date: saleDate || undefined,
      service_type: serviceType || null,
      source: source || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (inserted) {
    syncEmbedding(
      "sales",
      inserted.id,
      buildSaleText({ service_type: serviceType || null, payment_status: paymentStatus, sale_date: saleDate || null, source: source || null }),
      company.id,
    );
    if (contactId) {
      try {
        await logActivity(supabase, company.id, contactId, {
          type: "invoice_created",
          label: `Revenue of $${amount.toFixed(2)} recorded`,
          referenceId: inserted.id,
          referenceType: "sale",
          source: "user",
        });
      } catch {
        // Non-fatal
      }
    }
  }

  revalidatePath("/sales");
  revalidatePath("/workspace");
  revalidatePath("/contacts");
  redirect("/sales?toast=Sale+recorded");
}

export async function updateSaleAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const amount = getOptionalNumber(formData, "amount");
  const paymentStatus = getFormString(formData, "payment_status") || "Paid";
  const saleDate = getFormString(formData, "sale_date");
  const serviceType = getFormString(formData, "service_type");
  const source = getFormString(formData, "source");
  const contactId = await resolveOwnedContactId(supabase, company.id, getFormString(formData, "contact_id"));

  if (amount === null) {
    return { fieldErrors: { amount: "Revenue amount is required." } };
  }

  if (amount < 0) {
    return { fieldErrors: { amount: "Must be a positive number." } };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("sales")
    .update({
      amount,
      payment_status: paymentStatus,
      sale_date: saleDate || undefined,
      service_type: serviceType || null,
      source: source || null,
      contact_id: contactId || null,
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) return { error: error.message };

  syncEmbedding(
    "sales",
    id,
    buildSaleText({ service_type: serviceType || null, payment_status: paymentStatus, sale_date: saleDate || null, source: source || null }),
    company.id,
  );

  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
  revalidatePath(`/sales/${id}/edit`);
  revalidatePath("/workspace");
  revalidatePath("/contacts");
  redirect("/sales?toast=Sale+updated");
}

export async function deleteSaleAction(id: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { error } = await supabase
    .from("sales")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/sales/${id}/edit?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/sales");
  revalidatePath("/workspace");
  revalidatePath("/contacts");
  redirect("/sales?toast=Sale+deleted");
}
