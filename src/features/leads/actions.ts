"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString, getOptionalNumber } from "@/lib/utils";
import { resolveOwnedContactId } from "@/lib/crm/contacts";
import { syncAcceptedOpportunity, resolveOpenFollowUps } from "@/lib/lifecycle";
import { isWon, isLost } from "@/lib/status";

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

  const contactId = await resolveOwnedContactId(supabase, company.id, customerId);
  if (customerId && contactId === null) {
    return { fieldErrors: { customer_id: "Selected customer isn't in your workspace." } };
  }

  const { data: inserted, error } = await supabase
    .from("leads")
    .insert({
      company_id: company.id,
      customer_id: null,
      contact_id: contactId,
      service_requested: serviceRequested,
      status,
      estimated_value: estimatedValue,
      source: source || null,
      next_follow_up_date: nextFollowUpDate || null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  let convertedJobId: string | null = null;
  if (inserted && isWon(status)) {
    try {
      convertedJobId = await syncAcceptedOpportunity({
        supabase,
        companyId: company.id,
        opportunityId: inserted.id,
        contactId,
        opportunityName: serviceRequested,
        amount: estimatedValue,
      });
    } catch (err) {
      console.error("[lifecycle] syncAcceptedOpportunity failed", err);
    }
  }

  revalidatePath("/crm");
  revalidatePath("/workspace");
  revalidatePath("/customers");
  // Won on creation -> a Job now exists; land there, not back on the board,
  // so the win-to-job transition reads as one continuous step, not a jump.
  if (convertedJobId) redirect(`/jobs/${convertedJobId}/edit?toast=Marked+Won+%E2%80%94+Job+created`);
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

  const contactId = await resolveOwnedContactId(supabase, company.id, customerId);
  if (customerId && contactId === null) {
    return { fieldErrors: { customer_id: "Selected customer isn't in your workspace." } };
  }

  const { error } = await supabase
    .from("leads")
    .update({
      customer_id: null,
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

  let convertedJobId: string | null = null;
  if (isWon(status)) {
    try {
      convertedJobId = await syncAcceptedOpportunity({
        supabase,
        companyId: company.id,
        opportunityId: id,
        contactId,
        opportunityName: serviceRequested,
        amount: estimatedValue,
      });
    } catch (err) {
      console.error("[lifecycle] syncAcceptedOpportunity failed", err);
    }
  }
  if (isLost(status)) {
    try {
      await resolveOpenFollowUps({ supabase, companyId: company.id, leadId: id, contactId });
    } catch (err) {
      console.error("[lifecycle] resolveOpenFollowUps failed", err);
    }
  }

  revalidatePath(`/leads/${id}/edit`);
  revalidatePath("/crm");
  revalidatePath("/workspace");
  revalidatePath("/customers");
  // Marking Won just superseded this lead with a Job (see Pipeline's dedup
  // rules) -- land there directly instead of back on the board, so the
  // transition reads as one continuous step, not a jump to a random page.
  if (convertedJobId) redirect(`/jobs/${convertedJobId}/edit?toast=Marked+Won+%E2%80%94+Job+created`);
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
  revalidatePath("/customers");
  redirect("/crm?toast=Opportunity+deleted");
}

export async function bulkUpdateLeadsStatus(ids: string[], status: string) {
  if (ids.length === 0 || !status) return;
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return;
  const { company } = currentCompany;

  const { data: updated, error } = await supabase
    .from("leads")
    .update({ status })
    .in("id", ids)
    .eq("company_id", company.id)
    .select("id, contact_id, service_requested, estimated_value");

  if (error) throw new Error(error.message);

  // Single-record forms (createLeadAction/updateLeadAction) call
  // syncAcceptedOpportunity on Won so a Job gets created -- this bulk path
  // updated the status directly and skipped that, so bulk-marking Won
  // silently never created a Job. Each conversion is independent and
  // non-fatal so one bad lead can't abort the rest of the batch. Same
  // reasoning for resolveOpenFollowUps on Lost, so bulk-marking a batch of
  // leads Lost doesn't leave every one of them still nagging about an open
  // follow-up for a dead opportunity.
  if (isWon(status)) {
    for (const lead of updated ?? []) {
      try {
        await syncAcceptedOpportunity({
          supabase,
          companyId: company.id,
          opportunityId: lead.id,
          contactId: lead.contact_id,
          opportunityName: lead.service_requested ?? "Opportunity",
          amount: lead.estimated_value,
        });
      } catch (err) {
        console.error("[lifecycle] syncAcceptedOpportunity failed", err);
      }
    }
  }
  if (isLost(status)) {
    for (const lead of updated ?? []) {
      try {
        await resolveOpenFollowUps({ supabase, companyId: company.id, leadId: lead.id, contactId: lead.contact_id });
      } catch (err) {
        console.error("[lifecycle] resolveOpenFollowUps failed", err);
      }
    }
  }

  revalidatePath("/crm");
}
