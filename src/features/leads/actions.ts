"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString, getOptionalNumber } from "@/lib/utils";

export async function createLeadAction(formData: FormData) {
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
    redirect("/leads?error=Opportunity+name+is+required.");
  }

  const { error } = await supabase.from("leads").insert({
    company_id: company.id,
    customer_id: customerId || null,
    service_requested: serviceRequested,
    status,
    estimated_value: estimatedValue,
    source: source || null,
    next_follow_up_date: nextFollowUpDate || null,
    notes: notes || null,
  });

  if (error) redirect(`/leads?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/leads");
  revalidatePath("/crm");
  revalidatePath("/workspace");
  redirect("/leads");
}

export async function updateLeadAction(id: string, formData: FormData) {
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
    redirect(`/leads/${id}/edit?error=Opportunity+name+is+required.`);
  }

  const { error } = await supabase
    .from("leads")
    .update({
      customer_id: customerId || null,
      service_requested: serviceRequested,
      status,
      estimated_value: estimatedValue,
      source: source || null,
      next_follow_up_date: nextFollowUpDate || null,
      notes: notes || null,
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/leads/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/leads");
  revalidatePath("/crm");
  revalidatePath("/workspace");
  redirect("/leads");
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

  revalidatePath("/leads");
  revalidatePath("/crm");
  revalidatePath("/workspace");
  redirect("/leads");
}
