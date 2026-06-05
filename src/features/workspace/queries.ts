import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import type { LeadRow, JobRow, SaleRow, FollowUpRow } from "./types";

type WorkspaceCustomer = { id: string; name: string; phone: string | null; email: string | null; address: string | null; customer_type: string | null; created_at: string };
type WorkspaceLead = Pick<LeadRow, "id" | "customer_id" | "service_requested" | "status" | "estimated_value" | "source" | "next_follow_up_date" | "created_at">;
type WorkspaceJob = Pick<JobRow, "id" | "customer_id" | "lead_id" | "service_type" | "status" | "job_value" | "start_date" | "completed_date" | "paid_status" | "created_at"> & { contact_id: string | null };
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
  // Calculate 6 months ago for sales filter (~183 days, avoids setMonth overflow on month-end dates)
  const sixMonthsAgo = new Date(Date.now() - 183 * 24 * 60 * 60 * 1000);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0]; // "YYYY-MM-DD"

  const [
    customersResult,
    leadsResult,
    jobsResult,
    salesResult,
    followUpsResult,
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("master_customers")
      .select("id, first_name, last_name, primary_phone, primary_email, billing_address, metadata, created_at")
      .eq("organization_id", companyId)
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("jobs")
      .select(
        "id, customer_id, contact_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at",
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
      .gte("sale_date", sixMonthsAgoStr)
      .order("created_at", { ascending: false })
      .limit(500),

    supabase
      .from("follow_ups")
      .select("id, customer_id, message, due_date, status, created_at")
      .eq("company_id", companyId)
      .not("status", "in", '("completed","done","closed")')
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(500),
  ]);

  const rawContacts = (customersResult.data ?? []) as Array<{
    id: string; first_name: string; last_name: string | null;
    primary_phone: string | null; primary_email: string | null;
    billing_address: { line1?: string } | null;
    metadata: { customer_type?: string } | null;
    created_at: string;
  }>;
  const mappedCustomers: WorkspaceCustomer[] = rawContacts.map((r) => ({
    id: r.id,
    name: [r.first_name, r.last_name].filter(Boolean).join(" "),
    phone: r.primary_phone,
    email: r.primary_email,
    address: r.billing_address?.line1 ?? null,
    customer_type: r.metadata?.customer_type ?? null,
    created_at: r.created_at,
  }));

  return {
    customers: mappedCustomers,
    leads: (leadsResult.data ?? []) as WorkspaceLead[],
    jobs: (jobsResult.data ?? []) as WorkspaceJob[],
    sales: (salesResult.data ?? []) as WorkspaceSale[],
    followUps: (followUpsResult.data ?? []) as WorkspaceFollowUp[],
  };
}
