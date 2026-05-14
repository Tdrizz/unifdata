import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import type { LeadRow, CustomerRow } from "./types";

type CRMLead = Pick<LeadRow, "id" | "customer_id" | "service_requested" | "status" | "estimated_value" | "source" | "next_follow_up_date" | "notes" | "created_at">;
type CRMCustomer = Pick<CustomerRow, "id" | "name" | "email" | "phone">;

export type CRMPageData = {
  leads: CRMLead[];
  customers: CRMCustomer[];
};

export async function getCRMPageData(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<CRMPageData> {
  const [leadsResult, customersResult] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, notes, created_at",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),

    supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (leadsResult.error) throw new Error(leadsResult.error.message);
  if (customersResult.error) throw new Error(customersResult.error.message);

  return {
    leads: leadsResult.data as CRMLead[],
    customers: customersResult.data as CRMCustomer[],
  };
}
