import type { SupabaseClient } from "@supabase/supabase-js";
import type { SaleRow, CustomerRow, JobRow } from "./types";

type SalesPageOpts = { q?: string; page?: number; pageSize?: number };

export async function getSalesPageData(
  supabase: SupabaseClient,
  companyId: string,
  opts: SalesPageOpts = {},
): Promise<{ sales: SaleRow[]; count: number }> {
  const { q, page = 1, pageSize = 50 } = opts;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("sales")
    .select("id, amount, payment_status, sale_date, service_type, source, created_at", { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (q) query = query.or(`service_type.ilike.%${q}%,source.ilike.%${q}%,payment_status.ilike.%${q}%`);

  const { data, count } = await query.range(from, to);
  return { sales: (data ?? []) as SaleRow[], count: count ?? 0 };
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

  if (error) return null;
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
