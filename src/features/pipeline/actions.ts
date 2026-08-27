"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { isAcceptedOpportunityStatus, isCompletedPaidJob, syncAcceptedOpportunity, syncSaleForJob } from "@/lib/lifecycle";

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

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("contact_id, service_requested, estimated_value")
    .eq("id", leadId)
    .eq("company_id", company.id)
    .single();
  if (fetchError || !lead) throw new Error(fetchError?.message ?? "Opportunity not found.");

  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .eq("company_id", company.id);
  if (error) throw new Error(error.message);

  if (isAcceptedOpportunityStatus(status)) {
    await syncAcceptedOpportunity({
      supabase,
      companyId: company.id,
      opportunityId: leadId,
      contactId: lead.contact_id,
      opportunityName: lead.service_requested ?? "Opportunity",
      amount: lead.estimated_value,
    });
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

  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("contact_id, service_type, job_value, paid_status")
    .eq("id", jobId)
    .eq("company_id", company.id)
    .single();
  if (fetchError || !job) throw new Error(fetchError?.message ?? "Job not found.");

  const nextPaidStatus = paidStatus ?? job.paid_status;

  const { error } = await supabase
    .from("jobs")
    .update({ status, paid_status: nextPaidStatus })
    .eq("id", jobId)
    .eq("company_id", company.id);
  if (error) throw new Error(error.message);

  if (isCompletedPaidJob(status, nextPaidStatus)) {
    await syncSaleForJob({
      supabase,
      companyId: company.id,
      jobId,
      contactId: job.contact_id,
      serviceType: job.service_type ?? "Job",
      amount: job.job_value,
      source: null,
    });
  }

  revalidatePath("/crm");
}
