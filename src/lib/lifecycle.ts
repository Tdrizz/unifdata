import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

export function isAcceptedOpportunityStatus(status: string | null) {
  return status === "Won";
}

export function isCompletedPaidJob(status: string | null, paidStatus: string | null) {
  const s = (status || "").toLowerCase();
  const p = (paidStatus || "").toLowerCase();
  return s.includes("complete") && p === "paid";
}

type SupabaseWriteClient = {
  from: SupabaseClient<Database>["from"];
};

// Lead marked Won -> find-or-create its Job. Idempotent: keyed on (company_id,
// lead_id), so toggling Won/Lost/Won repeatedly just updates the same row.
export async function syncAcceptedOpportunity({
  supabase,
  companyId,
  opportunityId,
  contactId,
  opportunityName,
  amount,
}: {
  supabase: SupabaseWriteClient;
  companyId: string;
  opportunityId: string;
  contactId: string | null;
  opportunityName: string;
  amount: number | null;
}) {
  const { data: existingJob, error: existingJobError } = await supabase
    .from("jobs")
    .select("id")
    .eq("company_id", companyId)
    .eq("lead_id", opportunityId)
    .maybeSingle();

  if (existingJobError) {
    throw new Error(existingJobError.message);
  }

  if (!existingJob) {
    const { error: createdJobError } = await supabase.from("jobs").insert({
      company_id: companyId,
      contact_id: contactId,
      lead_id: opportunityId,
      service_type: opportunityName,
      status: "Scheduled",
      job_value: amount,
      start_date: null,
      completed_date: null,
      paid_status: "Unpaid",
      notes: "Created automatically when this opportunity was accepted.",
    });

    if (createdJobError) {
      throw new Error(createdJobError.message);
    }
    return;
  }

  const { error: updateJobError } = await supabase
    .from("jobs")
    .update({
      contact_id: contactId,
      service_type: opportunityName,
      job_value: amount,
    })
    .eq("id", existingJob.id)
    .eq("company_id", companyId);

  if (updateJobError) {
    throw new Error(updateJobError.message);
  }
}

// Job marked complete + paid -> find-or-create its Sale. Idempotent: keyed on
// (company_id, job_id).
export async function syncSaleForJob({
  supabase,
  companyId,
  jobId,
  contactId,
  serviceType,
  amount,
  source,
}: {
  supabase: SupabaseWriteClient;
  companyId: string;
  jobId: string;
  contactId: string | null;
  serviceType: string;
  amount: number | null;
  source: string | null;
}) {
  if (amount == null || amount <= 0) return;

  const { data: existingSale, error: existingSaleError } = await supabase
    .from("sales")
    .select("id")
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existingSaleError) {
    throw new Error(existingSaleError.message);
  }

  if (!existingSale) {
    const { error: createSaleError } = await supabase.from("sales").insert({
      company_id: companyId,
      contact_id: contactId,
      job_id: jobId,
      amount,
      payment_status: "Paid",
      sale_date: new Date().toISOString().slice(0, 10),
      service_type: serviceType,
      source,
    });

    if (createSaleError) {
      throw new Error(createSaleError.message);
    }
    return;
  }

  const { error: updateSaleError } = await supabase
    .from("sales")
    .update({
      contact_id: contactId,
      amount,
      service_type: serviceType,
      source,
      payment_status: "Paid",
    })
    .eq("id", existingSale.id)
    .eq("company_id", companyId);

  if (updateSaleError) {
    throw new Error(updateSaleError.message);
  }
}
