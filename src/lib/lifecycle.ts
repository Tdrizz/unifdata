import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import { isOpenFollowUp } from "@/lib/status";

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
// Returns the job's id so the caller can send the user straight to it instead
// of leaving them on the now-superseded lead.
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
}): Promise<string> {
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
    const { data: createdJob, error: createdJobError } = await supabase
      .from("jobs")
      .insert({
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
      })
      .select("id")
      .single();

    if (createdJobError) {
      throw new Error(createdJobError.message);
    }
    return createdJob.id as string;
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

  return existingJob.id as string;
}

// Job marked complete + paid -> find-or-create its Sale. Idempotent: keyed on
// (company_id, job_id). Returns the sale's id (or null if no sale was created,
// e.g. the job has no value yet) so the caller can send the user straight to it.
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
}): Promise<string | null> {
  if (amount == null || amount <= 0) return null;

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
    const { data: createdSale, error: createSaleError } = await supabase
      .from("sales")
      .insert({
        company_id: companyId,
        contact_id: contactId,
        job_id: jobId,
        amount,
        payment_status: "Paid",
        sale_date: new Date().toISOString().slice(0, 10),
        service_type: serviceType,
        source,
      })
      .select("id")
      .single();

    if (createSaleError) {
      throw new Error(createSaleError.message);
    }
    return createdSale.id as string;
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

  return existingSale.id as string;
}

// A lead marked Lost, or a job marked Completed or Cancelled, means the work
// it represents is done or dead -- but nothing else in the app ever resolved
// the open follow-up(s) tied to it, so one survived indefinitely: it kept
// showing as a "Follow-up due" badge on the pipeline board (even on the Sale
// card that superseded a completed job), kept counting toward Data Hub's
// overdue-follow-up issue total, and kept escalating as a nightly alert via
// the record-nudger worker -- all for work that was actually finished. This
// marks every currently-open follow-up linked to the given lead and/or
// contact Complete. Matches on contactId too, not just leadId, because
// Vera's create_followup tool has no lead_id parameter at all -- an
// AI-created follow-up can only ever be linked via contact_id.
//
// Returns how many follow-ups it actually resolved, so a caller building a
// user-facing message (the AI tool-executor in particular) can say so only
// when something real happened, rather than always claiming it did.
export async function resolveOpenFollowUps({
  supabase,
  companyId,
  leadId,
  contactId,
}: {
  supabase: SupabaseWriteClient;
  companyId: string;
  leadId?: string | null;
  contactId?: string | null;
}): Promise<number> {
  if (!leadId && !contactId) return 0;

  const orParts: string[] = [];
  if (leadId) orParts.push(`lead_id.eq.${leadId}`);
  if (contactId) orParts.push(`contact_id.eq.${contactId}`);

  const { data: followUps, error } = await supabase
    .from("follow_ups")
    .select("id, status")
    .eq("company_id", companyId)
    .or(orParts.join(","));

  if (error || !followUps) return 0;

  const openIds = (followUps as { id: string; status: string }[])
    .filter((fu) => isOpenFollowUp(fu.status))
    .map((fu) => fu.id);

  if (openIds.length === 0) return 0;

  await supabase
    .from("follow_ups")
    .update({ status: "Complete", completed_at: new Date().toISOString() })
    .in("id", openIds);

  return openIds.length;
}
