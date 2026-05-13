"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString, getOptionalNumber } from "@/lib/utils";

export async function createJobAction(formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const customerId = getFormString(formData, "customer_id");
  const leadId = getFormString(formData, "lead_id");
  const serviceType = getFormString(formData, "service_type");
  const status = getFormString(formData, "status") || "Scheduled";
  const jobValue = getOptionalNumber(formData, "job_value");
  const startDate = getFormString(formData, "start_date");
  const completedDate = getFormString(formData, "completed_date");
  const paidStatus = getFormString(formData, "paid_status") || "Unpaid";

  if (!serviceType) {
    redirect("/jobs?error=Work+name+is+required.");
  }

  const { error } = await supabase.from("jobs").insert({
    company_id: company.id,
    customer_id: customerId || null,
    lead_id: leadId || null,
    service_type: serviceType,
    status,
    job_value: jobValue,
    start_date: startDate || null,
    completed_date: completedDate || null,
    paid_status: paidStatus,
  });

  if (error) redirect(`/jobs?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/jobs");
  revalidatePath("/workspace");
  redirect("/jobs");
}

export async function updateJobAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const customerId = getFormString(formData, "customer_id");
  const leadId = getFormString(formData, "lead_id");
  const serviceType = getFormString(formData, "service_type");
  const status = getFormString(formData, "status") || "Scheduled";
  const jobValue = getOptionalNumber(formData, "job_value");
  const startDate = getFormString(formData, "start_date");
  const completedDate = getFormString(formData, "completed_date");
  const paidStatus = getFormString(formData, "paid_status") || "Unpaid";

  if (!serviceType) {
    redirect(`/jobs/${id}/edit?error=Work+name+is+required.`);
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      customer_id: customerId || null,
      lead_id: leadId || null,
      service_type: serviceType,
      status,
      job_value: jobValue,
      start_date: startDate || null,
      completed_date: completedDate || null,
      paid_status: paidStatus,
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/jobs/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/jobs");
  revalidatePath("/workspace");
  redirect("/jobs");
}

export async function deleteJobAction(id: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/jobs/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/jobs");
  revalidatePath("/workspace");
  redirect("/jobs");
}
