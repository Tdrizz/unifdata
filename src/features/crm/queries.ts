import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import { masterToLegacyShape, MASTER_LEGACY_SELECT, type MasterCustomerRow } from "@/lib/crm/legacy-shape";
import type { LeadRow, CustomerRow } from "./types";

export type CRMLeadRow = Pick<
  LeadRow,
  "id" | "customer_id" | "service_requested" | "status" | "estimated_value" | "next_follow_up_date" | "source" | "created_at"
>;

export type CRMPageData = {
  leads: CRMLeadRow[];
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
};

const LEAD_FIELDS = "id, customer_id, service_requested, status, estimated_value, next_follow_up_date, source, created_at";

export async function getCRMPageData(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<CRMPageData> {
  const [leadsResult, customersResult] = await Promise.all([
    supabase
      .from("leads")
      .select(LEAD_FIELDS)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),

    supabase
      .from("master_customers")
      .select(MASTER_LEGACY_SELECT)
      .eq("organization_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  return {
    leads: (leadsResult.data ?? []) as CRMLeadRow[],
    customers: ((customersResult.data ?? []) as MasterCustomerRow[]).map(masterToLegacyShape) as Pick<CustomerRow, "id" | "name" | "email" | "phone">[],
  };
}
