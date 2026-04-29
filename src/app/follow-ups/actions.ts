"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentCompanyId } from "@/lib/current-company";
import { createClient } from "@/lib/supabase/server";

export async function createFollowUpAction(formData: FormData) {
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const customerId = String(formData.get("customerId") || "").trim();
  const leadId = String(formData.get("leadId") || "").trim();
  const dueDate = String(formData.get("dueDate") || "").trim();
  const status = String(formData.get("status") || "Open").trim();
  const message = String(formData.get("message") || "").trim();

  if (!dueDate) {
    throw new Error("Due date is required");
  }

  if (!message) {
    throw new Error("Message is required");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("follow_ups").insert({
    company_id: companyId,
    customer_id: customerId || null,
    lead_id: leadId || null,
    due_date: dueDate,
    status,
    message,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
}

export async function completeFollowUpAction(formData: FormData) {
  const followUpId = String(formData.get("followUpId") || "").trim();

  if (!followUpId) {
    throw new Error("Follow-up ID is required");
  }

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .update({
      status: "Completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", followUpId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/follow-ups");
}

export async function reopenFollowUpAction(formData: FormData) {
  const followUpId = String(formData.get("followUpId") || "").trim();

  if (!followUpId) {
    throw new Error("Follow-up ID is required");
  }

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .update({
      status: "Open",
      completed_at: null,
    })
    .eq("id", followUpId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/follow-ups");
}

export async function deleteFollowUpAction(formData: FormData) {
  const followUpId = String(formData.get("followUpId") || "").trim();

  if (!followUpId) {
    throw new Error("Follow-up ID is required");
  }

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("id", followUpId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/follow-ups");
}
