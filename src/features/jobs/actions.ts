"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString, getOptionalNumber } from "@/lib/utils";
import { logActivity } from "@/lib/crm/activity";
import { resolveOwnedContactId } from "@/lib/crm/contacts";
import { verifyOwned } from "@/lib/security/ownership";
import { syncEmbedding } from "@/lib/embeddings/sync";
import { buildJobText } from "@/lib/embeddings/generate";
import { isCompletedPaidJob, syncSaleForJob } from "@/lib/lifecycle";

export type ActionState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function createJobAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const contactId = await resolveOwnedContactId(supabase, company.id, getFormString(formData, "contact_id"));
  const leadId = getFormString(formData, "lead_id");
  const serviceType = getFormString(formData, "service_type");
  const status = getFormString(formData, "status") || "Scheduled";
  const jobValue = getOptionalNumber(formData, "job_value");
  const startDate = getFormString(formData, "start_date");
  const completedDate = getFormString(formData, "completed_date");
  const paidStatus = getFormString(formData, "paid_status") || "Unpaid";

  if (!serviceType) {
    return { fieldErrors: { service_type: "Work name is required." } };
  }

  if (jobValue !== null && jobValue < 0) {
    return { fieldErrors: { job_value: "Must be a positive number." } };
  }

  if (leadId && !(await verifyOwned(supabase, "leads", leadId, company.id))) {
    return { fieldErrors: { lead_id: "Selected opportunity isn't in your workspace." } };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any)
    .from("jobs")
    .insert({
      company_id: company.id,
      contact_id: contactId || null,
      lead_id: leadId || null,
      service_type: serviceType,
      status,
      job_value: jobValue,
      start_date: startDate || null,
      completed_date: completedDate || null,
      paid_status: paidStatus,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  let convertedSaleId: string | null = null;
  if (inserted) {
    syncEmbedding(
      "jobs",
      inserted.id,
      buildJobText({ service_type: serviceType, status, paid_status: paidStatus, start_date: startDate || null }),
      company.id,
    );
    if (contactId) {
      try {
        await logActivity(supabase, company.id, contactId, {
          type: "work_created",
          label: `Work "${serviceType}" created`,
          referenceId: inserted.id,
          referenceType: "job",
          source: "user",
        });
      } catch {
        // Non-fatal
      }
    }
    if (isCompletedPaidJob(status, paidStatus)) {
      try {
        convertedSaleId = await syncSaleForJob({
          supabase,
          companyId: company.id,
          jobId: inserted.id,
          contactId: contactId || null,
          serviceType,
          amount: jobValue,
          source: null,
        });
      } catch (err) {
        console.error("[lifecycle] syncSaleForJob failed", err);
      }
    }
  }

  revalidatePath("/jobs");
  revalidatePath("/sales");
  revalidatePath("/crm");
  revalidatePath("/workspace");
  revalidatePath("/customers");
  // Created already complete + paid -> a Sale now exists; land there, not
  // back on the board, so the job-to-sale transition reads as one step.
  if (convertedSaleId) redirect(`/sales/${convertedSaleId}/edit?toast=Job+complete+%E2%80%94+Sale+recorded`);
  redirect("/crm?toast=Job+created");
}

export async function updateJobAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const contactId = await resolveOwnedContactId(supabase, company.id, getFormString(formData, "contact_id"));
  const leadId = getFormString(formData, "lead_id");
  const serviceType = getFormString(formData, "service_type");
  const status = getFormString(formData, "status") || "Scheduled";
  const jobValue = getOptionalNumber(formData, "job_value");
  const startDate = getFormString(formData, "start_date");
  const completedDate = getFormString(formData, "completed_date");
  const paidStatus = getFormString(formData, "paid_status") || "Unpaid";

  if (!serviceType) {
    return { fieldErrors: { service_type: "Work name is required." } };
  }

  if (jobValue !== null && jobValue < 0) {
    return { fieldErrors: { job_value: "Must be a positive number." } };
  }

  if (leadId && !(await verifyOwned(supabase, "leads", leadId, company.id))) {
    return { fieldErrors: { lead_id: "Selected opportunity isn't in your workspace." } };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("jobs")
    .update({
      contact_id: contactId || null,
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

  if (error) return { error: error.message };

  syncEmbedding(
    "jobs",
    id,
    buildJobText({ service_type: serviceType, status, paid_status: paidStatus, start_date: startDate || null }),
    company.id,
  );

  let convertedSaleId: string | null = null;
  if (isCompletedPaidJob(status, paidStatus)) {
    try {
      convertedSaleId = await syncSaleForJob({
        supabase,
        companyId: company.id,
        jobId: id,
        contactId: contactId || null,
        serviceType,
        amount: jobValue,
        source: null,
      });
    } catch (err) {
      console.error("[lifecycle] syncSaleForJob failed", err);
    }
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  revalidatePath(`/jobs/${id}/edit`);
  revalidatePath("/sales");
  revalidatePath("/crm");
  revalidatePath("/workspace");
  revalidatePath("/customers");
  // Marking complete + paid just superseded this job with a Sale (see
  // Pipeline's dedup rules) -- land there directly instead of back on the
  // board, so the transition reads as one continuous step.
  if (convertedSaleId) redirect(`/sales/${convertedSaleId}/edit?toast=Job+complete+%E2%80%94+Sale+recorded`);
  redirect("/crm?toast=Job+updated");
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
  revalidatePath("/crm");
  revalidatePath("/workspace");
  revalidatePath("/customers");
  redirect("/crm?toast=Job+deleted");
}
