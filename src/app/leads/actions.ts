"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentCompanyId } from "@/lib/current-company";
import { createClient } from "@/lib/supabase/server";

export async function createLeadAction(formData: FormData) {
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const customerId = String(formData.get("customerId") || "").trim();
  const source = String(formData.get("source") || "").trim();
  const serviceRequested = String(
    formData.get("serviceRequested") || "",
  ).trim();
  const status = String(formData.get("status") || "New").trim();
  const estimatedValueRaw = String(
    formData.get("estimatedValue") || "",
  ).trim();
  const nextFollowUpDate = String(
    formData.get("nextFollowUpDate") || "",
  ).trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!serviceRequested) {
    throw new Error("Service requested is required");
  }

  const estimatedValue = estimatedValueRaw
    ? Number(estimatedValueRaw)
    : null;

  if (estimatedValueRaw && Number.isNaN(estimatedValue)) {
    throw new Error("Estimated value must be a number");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("leads").insert({
    company_id: companyId,
    customer_id: customerId || null,
    source: source || null,
    service_requested: serviceRequested,
    status,
    estimated_value: estimatedValue,
    next_follow_up_date: nextFollowUpDate || null,
    notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/leads");
  revalidatePath("/workspace");
}

export async function deleteLeadAction(formData: FormData) {
  const leadId = String(formData.get("leadId") || "").trim();

  if (!leadId) {
    throw new Error("Lead ID is required");
  }

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/leads");
}