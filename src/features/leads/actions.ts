"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString, getOptionalNumber } from "@/lib/utils";

export type ActionState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function createLeadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const customerId = getFormString(formData, "customer_id");
  const serviceRequested = getFormString(formData, "service_requested");
  const status = getFormString(formData, "status") || "New";
  const estimatedValue = getOptionalNumber(formData, "estimated_value");
  const source = getFormString(formData, "source");
  const nextFollowUpDate = getFormString(formData, "next_follow_up_date");
  const notes = getFormString(formData, "notes");

  if (!serviceRequested) {
    return { fieldErrors: { service_requested: "Opportunity name is required." } };
  }

  if (estimatedValue !== null && estimatedValue < 0) {
    return { fieldErrors: { estimated_value: "Must be a positive number." } };
  }

  let contactId: string | null = null;
  if (customerId) {
    const { data: mc } = await supabase
      .from("master_customers")
      .select("id")
      .eq("organization_id", company.id)
      .eq("legacy_customer_id", customerId)
      .maybeSingle();
    contactId = mc?.id ?? null;
  }

  const { error } = await supabase.from("leads").insert({
    company_id: company.id,
    customer_id: customerId || null,
    contact_id: contactId,
    service_requested: serviceRequested,
    status,
    estimated_value: estimatedValue,
    source: source || null,
    next_follow_up_date: nextFollowUpDate || null,
    notes: notes || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/crm");
  revalidatePath("/workspace");
  revalidatePath("/contacts");
  redirect("/crm?toast=Opportunity+created");
}

export async function updateLeadAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const customerId = getFormString(formData, "customer_id");
  const serviceRequested = getFormString(formData, "service_requested");
  const status = getFormString(formData, "status") || "New";
  const estimatedValue = getOptionalNumber(formData, "estimated_value");
  const source = getFormString(formData, "source");
  const nextFollowUpDate = getFormString(formData, "next_follow_up_date");
  const notes = getFormString(formData, "notes");

  if (!serviceRequested) {
    return { fieldErrors: { service_requested: "Opportunity name is required." } };
  }

  if (estimatedValue !== null && estimatedValue < 0) {
    return { fieldErrors: { estimated_value: "Must be a positive number." } };
  }

  let contactId: string | null = null;
  if (customerId) {
    const { data: mc } = await supabase
      .from("master_customers")
      .select("id")
      .eq("organization_id", company.id)
      .eq("legacy_customer_id", customerId)
      .maybeSingle();
    contactId = mc?.id ?? null;
  }

  const { error } = await supabase
    .from("leads")
    .update({
      customer_id: customerId || null,
      contact_id: contactId,
      service_requested: serviceRequested,
      status,
      estimated_value: estimatedValue,
      source: source || null,
      next_follow_up_date: nextFollowUpDate || null,
      notes: notes || null,
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) return { error: error.message };

  revalidatePath(`/leads/${id}/edit`);
  revalidatePath("/crm");
  revalidatePath("/workspace");
  revalidatePath("/contacts");
  redirect("/crm?toast=Opportunity+updated");
}

export async function deleteLeadAction(id: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/leads/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/crm");
  revalidatePath("/workspace");
  revalidatePath("/contacts");
  redirect("/crm?toast=Opportunity+deleted");
}

export async function bulkUpdateLeadsStatus(ids: string[], status: string) {
  if (ids.length === 0 || !status) return;
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return;
  const { company } = currentCompany;

  const { error } = await supabase
    .from("leads")
    .update({ status })
    .in("id", ids)
    .eq("company_id", company.id);

  if (error) throw new Error(error.message);
  revalidatePath("/crm");
}
