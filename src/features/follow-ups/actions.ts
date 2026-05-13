"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString } from "@/lib/utils";

export async function createFollowUpAction(formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const message = getFormString(formData, "message");
  if (!message) redirect("/follow-ups?error=Follow-up+action+is+required.");

  const { error } = await supabase.from("follow_ups").insert({
    company_id: company.id,
    customer_id: getFormString(formData, "customer_id") || null,
    message,
    due_date: getFormString(formData, "due_date") || null,
    status: getFormString(formData, "status") || "Open",
  });

  if (error) redirect(`/follow-ups?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
  redirect("/follow-ups");
}

export async function updateFollowUpAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { error } = await supabase
    .from("follow_ups")
    .update({
      customer_id: getFormString(formData, "customer_id") || null,
      message: getFormString(formData, "message") || null,
      due_date: getFormString(formData, "due_date") || null,
      status: getFormString(formData, "status") || null,
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/follow-ups/${id}/edit?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
  redirect("/follow-ups");
}

export async function deleteFollowUpAction(id: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/follow-ups/${id}/edit?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
  redirect("/follow-ups");
}
