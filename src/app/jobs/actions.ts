"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentCompanyId } from "@/lib/current-company";
import { createClient } from "@/lib/supabase/server";

export async function createJobAction(formData: FormData) {
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const customerId = String(formData.get("customerId") || "").trim();
  const leadId = String(formData.get("leadId") || "").trim();
  const serviceType = String(formData.get("serviceType") || "").trim();
  const status = String(formData.get("status") || "Scheduled").trim();
  const jobValueRaw = String(formData.get("jobValue") || "").trim();
  const startDate = String(formData.get("startDate") || "").trim();
  const completedDate = String(formData.get("completedDate") || "").trim();
  const paidStatus = String(formData.get("paidStatus") || "Unpaid").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!serviceType) {
    throw new Error("Service type is required");
  }

  const jobValue = jobValueRaw ? Number(jobValueRaw) : null;

  if (jobValueRaw && Number.isNaN(jobValue)) {
    throw new Error("Job value must be a number");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("jobs").insert({
    company_id: companyId,
    customer_id: customerId || null,
    lead_id: leadId || null,
    service_type: serviceType,
    status,
    job_value: jobValue,
    start_date: startDate || null,
    completed_date: completedDate || null,
    paid_status: paidStatus,
    notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/jobs");
  revalidatePath("/workspace");
}

export async function deleteJobAction(formData: FormData) {
  const jobId = String(formData.get("jobId") || "").trim();

  if (!jobId) {
    throw new Error("Job ID is required");
  }

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/jobs");
}