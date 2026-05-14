import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import type { CustomerRow, LeadRow, JobRow, SaleRow, FollowUpRow } from "./types";

type WorkspaceCustomer = Pick<CustomerRow, "id" | "name" | "phone" | "email" | "address" | "customer_type" | "created_at">;
type WorkspaceLead = Pick<LeadRow, "id" | "customer_id" | "service_requested" | "status" | "estimated_value" | "source" | "next_follow_up_date" | "created_at">;
type WorkspaceJob = Pick<JobRow, "id" | "customer_id" | "lead_id" | "service_type" | "status" | "job_value" | "start_date" | "completed_date" | "paid_status" | "created_at">;
type WorkspaceSale = Pick<SaleRow, "id" | "amount" | "payment_status" | "sale_date" | "service_type" | "source" | "created_at">;
type WorkspaceFollowUp = Pick<FollowUpRow, "id" | "customer_id" | "message" | "due_date" | "status" | "created_at">;

export type WorkspaceData = {
  customers: WorkspaceCustomer[];
  leads: WorkspaceLead[];
  jobs: WorkspaceJob[];
  sales: WorkspaceSale[];
  followUps: WorkspaceFollowUp[];
};

export async function getWorkspaceData(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<WorkspaceData> {
  const [
    customersResult,
    leadsResult,
    jobsResult,
    salesResult,
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
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(500),
  ]);

  return {
    customers: (customersResult.data ?? []) as WorkspaceCustomer[],
    leads: (leadsResult.data ?? []) as WorkspaceLead[],
    jobs: (jobsResult.data ?? []) as WorkspaceJob[],
    sales: (salesResult.data ?? []) as WorkspaceSale[],
    followUps: (followUpsResult.data ?? []) as WorkspaceFollowUp[],
  };
}
