"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString } from "@/lib/utils";
import { logActivity } from "@/lib/crm/activity";

export type ActionState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function createFollowUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const message = getFormString(formData, "message");
  if (!message) return { fieldErrors: { message: "Follow-up action is required." } };
  const dueDate = getFormString(formData, "due_date");
  if (!dueDate) return { fieldErrors: { due_date: "Due date is required." } };

  const contactId = getFormString(formData, "contact_id") || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any).from("follow_ups").insert({
    company_id: company.id,
    contact_id: contactId,
    message,
    due_date: dueDate,
    status: getFormString(formData, "status") || "Open",
  }).select("id").single();

  if (error) return { error: error.message };

  if (contactId && inserted) {
    try {
      await logActivity(supabase, company.id, contactId, {
        type: "task_created",
        label: `Follow-up created: ${message.slice(0, 80)}`,
        referenceId: inserted.id,
        referenceType: "follow_up",
        source: "user",
      });
    } catch {
      // Non-fatal
    }
  }

  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
  redirect("/follow-ups?toast=Follow-up+created");
}

export async function updateFollowUpAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const message = getFormString(formData, "message");
  if (!message) return { fieldErrors: { message: "Follow-up action is required." } };
  const dueDate = getFormString(formData, "due_date");
  if (!dueDate) return { fieldErrors: { due_date: "Due date is required." } };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("follow_ups")
    .update({
      contact_id: getFormString(formData, "contact_id") || null,
      message,
      due_date: dueDate,
      status: getFormString(formData, "status") || "Open",
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) return { error: error.message };
  revalidatePath("/follow-ups");
  revalidatePath(`/follow-ups/${id}`);
  revalidatePath(`/follow-ups/${id}/edit`);
  revalidatePath("/workspace");
  redirect("/follow-ups?toast=Follow-up+updated");
}

export async function markFollowUpCompleteAction(id: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "Complete" })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) return;
  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
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
  redirect("/follow-ups?toast=Follow-up+deleted");
}
