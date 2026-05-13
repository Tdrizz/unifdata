import type { SupabaseClient } from "@supabase/supabase-js";
import type { SaleRow, CustomerRow, JobRow } from "./types";

export async function getSalesPageData(
  supabase: SupabaseClient,
  companyId: string,
): Promise<{ sales: SaleRow[] }> {
  const { data, error } = await supabase
    .from("sales")
    .select("id, amount, payment_status, sale_date, service_type, source, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) throw new Error(error.message);
  return { sales: (data ?? []) as SaleRow[] };
}

export async function getSaleById(
  supabase: SupabaseClient,
  companyId: string,
  id: string,
): Promise<SaleRow | null> {
  const { data, error } = await supabase
    .from("sales")
    .select("id, amount, payment_status, sale_date, service_type, source, customer_id, created_at")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SaleRow | null;
}

export async function getCustomersForSaleSelect(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Pick<CustomerRow, "id" | "name">[]> {
  const { data } = await supabase
    .from("customers")
    .select("id, name")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(500);

  return (data ?? []) as Pick<CustomerRow, "id" | "name">[];
}

export async function getJobsForSaleSelect(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Pick<JobRow, "id" | "service_type">[]> {
  const { data } = await supabase
    .from("jobs")
    .select("id, service_type")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(500);

  return (data ?? []) as Pick<JobRow, "id" | "service_type">[];
}
