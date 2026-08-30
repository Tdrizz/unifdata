/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapRecordsToCards } from "./stages";
import type { PipelinePageData, RawFollowUp, RawJob, RawLead, RawSale } from "./types";

const LEAD_FIELDS = "id, contact_id, service_requested, status, estimated_value, next_follow_up_date, source, contact:master_customers(id, first_name, last_name)";
const JOB_FIELDS = "id, contact_id, lead_id, service_type, status, job_value, paid_status, start_date, contact:master_customers(id, first_name, last_name)";
const SALE_FIELDS = "id, contact_id, job_id, service_type, amount, payment_status, sale_date, contact:master_customers(id, first_name, last_name)";
const FOLLOW_UP_FIELDS = "id, lead_id, contact_id, due_date, status";

export async function getPipelinePageData(
  supabase: SupabaseClient,
  companyId: string,
): Promise<PipelinePageData> {
  const [leadsResult, jobsResult, salesResult, followUpsResult] = await Promise.all([
    (supabase as any)
      .from("leads")
      .select(LEAD_FIELDS)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),
    (supabase as any)
      .from("jobs")
      .select(JOB_FIELDS)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),
    (supabase as any)
      .from("sales")
      .select(SALE_FIELDS)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),
    // Status is free text (see src/lib/status.ts's warning against exact-match
    // SQL filters here) -- fetch all and let buildFollowUpIndex in stages.ts
    // filter with the tolerant isOpenFollowUp() helper instead of .neq().
    (supabase as any)
      .from("follow_ups")
      .select(FOLLOW_UP_FIELDS)
      .eq("company_id", companyId)
      .order("due_date", { ascending: true })
      .limit(500),
  ]);

  const leads = (leadsResult.data ?? []) as RawLead[];
  const jobs = (jobsResult.data ?? []) as RawJob[];
  const sales = (salesResult.data ?? []) as RawSale[];
  const followUps = (followUpsResult.data ?? []) as RawFollowUp[];

  return {
    cards: mapRecordsToCards(leads, jobs, sales, followUps),
    leads,
    jobs,
    sales,
  };
}
