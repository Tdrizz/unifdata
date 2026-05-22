import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import type { CustomerRow, LeadRow, JobRow, SaleRow, FollowUpRow, ProposalRow } from "./types";

type DataHubCustomer = Pick<CustomerRow, "id" | "name" | "phone" | "email" | "address" | "customer_type" | "created_at">;
type DataHubLead = Pick<LeadRow, "id" | "customer_id" | "service_requested" | "status" | "estimated_value" | "source" | "next_follow_up_date" | "created_at">;
type DataHubJob = Pick<JobRow, "id" | "customer_id" | "lead_id" | "service_type" | "status" | "job_value" | "start_date" | "completed_date" | "paid_status" | "created_at">;
type DataHubSale = Pick<SaleRow, "id" | "amount" | "payment_status" | "sale_date" | "service_type" | "source" | "created_at">;
type DataHubFollowUp = Pick<FollowUpRow, "id" | "customer_id" | "message" | "due_date" | "status" | "created_at">;

export type DataHubPageData = {
  customers: DataHubCustomer[];
  opportunities: DataHubLead[];
  workRecords: DataHubJob[];
  revenueRecords: DataHubSale[];
  followUps: DataHubFollowUp[];
};

export async function getDataHubPageData(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<DataHubPageData> {
  const [
    customersResult,
    opportunitiesResult,
    workResult,
    revenueResult,
    followUpsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email, address, customer_type, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),

    supabase
      .from("leads")
      .select(
        "id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, created_at",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),

    supabase
      .from("jobs")
      .select(
        "id, customer_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),

    supabase
      .from("sales")
      .select(
        "id, amount, payment_status, sale_date, service_type, source, created_at",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),

    supabase
      .from("follow_ups")
      .select("id, customer_id, message, due_date, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  return {
    customers: (customersResult.data ?? []) as DataHubCustomer[],
    opportunities: (opportunitiesResult.data ?? []) as DataHubLead[],
    workRecords: (workResult.data ?? []) as DataHubJob[],
    revenueRecords: (revenueResult.data ?? []) as DataHubSale[],
    followUps: (followUpsResult.data ?? []) as DataHubFollowUp[],
  };
}

export async function getPendingProposals(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<ProposalRow[]> {
  const { data } = await supabase
    .from("data_reconciliation_proposals")
    .select("*")
    .eq("organization_id", companyId)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as ProposalRow[];
}

export async function getPendingProposalsCount(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<number> {
  const { count } = await supabase
    .from("data_reconciliation_proposals")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", companyId)
    .eq("status", "PENDING");

  return count ?? 0;
}
