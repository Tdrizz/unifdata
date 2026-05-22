export function isAcceptedOpportunityStatus(status: string | null) {
  return status === "Won";
}

type SupabaseWriteClient = {
  from: SupabaseClient<Database>["from"];
};

export async function syncAcceptedOpportunity({
  supabase,
  companyId,
  opportunityId,
  relationshipId,
  opportunityName,
  amount,
  source,
}: {
  supabase: SupabaseWriteClient;
  companyId: string;
  opportunityId: string;
  relationshipId: string | null;
  opportunityName: string;
  amount: number | null;
  source: string | null;
}) {
  const { data: existingJob, error: existingJobError } = await supabase
    .from("jobs")
    .select("id, paid_status")
    .eq("company_id", companyId)
    .eq("lead_id", opportunityId)
    .maybeSingle();

  if (existingJobError) {
    throw new Error(existingJobError.message);
  }

  let workRecordId = existingJob?.id;

  if (!workRecordId) {
    const { data: createdJob, error: createdJobError } = await supabase
      .from("jobs")
      .insert({
        company_id: companyId,
        customer_id: relationshipId,
        lead_id: opportunityId,
        service_type: opportunityName,
        status: "Scheduled",
        job_value: amount,
        start_date: null,
        completed_date: null,
        paid_status: "Unpaid",
        notes: "Created automatically when this opportunity was accepted.",
      })
      .select("id")
      .single();

    if (createdJobError) {
      throw new Error(createdJobError.message);
    }

    workRecordId = createdJob.id;
  } else {
    const { error: updateJobError } = await supabase
      .from("jobs")
      .update({
        customer_id: relationshipId,
        service_type: opportunityName,
        job_value: amount,
      })
      .eq("id", workRecordId)
      .eq("company_id", companyId);

    if (updateJobError) {
      throw new Error(updateJobError.message);
    }
  }

  if (!workRecordId || !amount || amount <= 0) {
    return;
  }

  const { data: existingRevenue, error: existingRevenueError } = await supabase
    .from("sales")
    .select("id, payment_status")
    .eq("company_id", companyId)
    .eq("job_id", workRecordId)
    .maybeSingle();

  if (existingRevenueError) {
    throw new Error(existingRevenueError.message);
  }

  if (!existingRevenue) {
    const { error: createRevenueError } = await supabase.from("sales").insert({
      company_id: companyId,
      customer_id: relationshipId,
      job_id: workRecordId,
      amount,
      payment_status: "Unpaid",
      sale_date: new Date().toISOString().slice(0, 10),
      service_type: opportunityName,
      source,
    });

    if (createRevenueError) {
      throw new Error(createRevenueError.message);
    }

    return;
  }

  const { error: updateRevenueError } = await supabase
    .from("sales")
    .update({
      customer_id: relationshipId,
      amount,
      service_type: opportunityName,
      source,
    })
    .eq("id", existingRevenue.id)
    .eq("company_id", companyId);

  if (updateRevenueError) {
    throw new Error(updateRevenueError.message);
  }
}
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
