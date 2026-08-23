/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapRecordsToCards } from "./stages";
import type { PipelinePageData, RawJob, RawLead, RawSale } from "./types";

const LEAD_FIELDS = "id, contact_id, service_requested, status, estimated_value, next_follow_up_date, contact:master_customers(id, first_name, last_name)";
const JOB_FIELDS = "id, contact_id, lead_id, service_type, status, job_value, paid_status, start_date, contact:master_customers(id, first_name, last_name)";
const SALE_FIELDS = "id, contact_id, job_id, service_type, amount, payment_status, sale_date, contact:master_customers(id, first_name, last_name)";

export async function getPipelinePageData(
  supabase: SupabaseClient,
  companyId: string,
): Promise<PipelinePageData> {
  const [leadsResult, jobsResult, salesResult] = await Promise.all([
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
  ]);

  const leads = (leadsResult.data ?? []) as RawLead[];
  const jobs = (jobsResult.data ?? []) as RawJob[];
  const sales = (salesResult.data ?? []) as RawSale[];

  return {
    cards: mapRecordsToCards(leads, jobs, sales),
    leads,
    jobs,
    sales,
  };
}
