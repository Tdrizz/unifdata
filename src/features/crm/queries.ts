import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import type { LeadRow, CustomerRow } from "./types";

export type CRMPageData = {
  leads: LeadRow[];
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
};

export async function getCRMPageData(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<CRMPageData> {
  const [leadsResult, customersResult] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
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

  return {
    leads: (leadsResult.data ?? []) as LeadRow[],
    customers: (customersResult.data ?? []) as Pick<CustomerRow, "id" | "name" | "email" | "phone">[],
  };
}
