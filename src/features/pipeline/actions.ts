"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { isCompletedPaidJob, syncAcceptedOpportunity, syncSaleForJob } from "@/lib/lifecycle";
import { isWon } from "@/lib/status";

// Small, direct status transitions for the Pipeline board's per-card action
// buttons -- deliberately not the full create/update forms (JobForm.tsx,
// LeadForm.tsx), which redirect and require every field. These stay on
// /crm and touch only the one field the button is for, reusing the same
// auto-conversion helpers those forms already call so a "Won" or
// "Complete + Paid" transition behaves identically no matter which UI
// triggered it.

export async function setLeadStatusAction(leadId: string, status: string): Promise<void> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Not signed in.");
  const { company } = currentCompany;

  const { data: lead, error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .eq("company_id", company.id)
    .select("contact_id, service_requested, estimated_value")
    .single();
  if (error || !lead) throw new Error(error?.message ?? "Opportunity not found.");

  // Non-fatal, matching every other caller of syncAcceptedOpportunity
  // (createLeadAction/updateLeadAction/bulkUpdateLeadsStatus) -- the status
  // change above already committed, so a transient failure here shouldn't
  // surface as if nothing happened; it should still revalidate and let the
  // card show its new (already-saved) status.
  if (isWon(status)) {
    try {
      await syncAcceptedOpportunity({
        supabase,
        companyId: company.id,
        opportunityId: leadId,
        contactId: lead.contact_id,
        opportunityName: lead.service_requested ?? "Opportunity",
        amount: lead.estimated_value,
      });
    } catch (err) {
      console.error("[pipeline.setLeadStatusAction] syncAcceptedOpportunity failed", err);
    }
  }

  revalidatePath("/crm");
}

export async function setJobStatusAction(
  jobId: string,
  status: string,
  paidStatus?: string,
): Promise<void> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Not signed in.");
  const { company } = currentCompany;

  // paid_status is only included in the update when the caller explicitly
  // passes one -- otherwise it's left untouched, and the RETURNING select
  // below reports its current value for the isCompletedPaidJob check.
  const updates: { status: string; paid_status?: string } = { status };
  if (paidStatus !== undefined) updates.paid_status = paidStatus;

  const { data: job, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", jobId)
    .eq("company_id", company.id)
    .select("contact_id, service_type, job_value, paid_status")
    .single();
  if (error || !job) throw new Error(error?.message ?? "Job not found.");

  // Non-fatal, matching every other caller of syncSaleForJob
  // (createJobAction/updateJobAction) -- see setLeadStatusAction above.
  if (isCompletedPaidJob(status, job.paid_status)) {
    try {
      await syncSaleForJob({
        supabase,
        companyId: company.id,
        jobId,
        contactId: job.contact_id,
        serviceType: job.service_type ?? "Job",
        amount: job.job_value,
        source: null,
      });
    } catch (err) {
      console.error("[pipeline.setJobStatusAction] syncSaleForJob failed", err);
    }
  }

  revalidatePath("/crm");
}
