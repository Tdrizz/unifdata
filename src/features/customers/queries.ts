import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomerRow } from "./types";

type CustomersPageOpts = { q?: string; page?: number; pageSize?: number };

export async function getCustomersPageData(
  supabase: SupabaseClient,
  companyId: string,
  opts: CustomersPageOpts = {},
) {
  const { q, page = 1, pageSize = 50 } = opts;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("customers")
    .select(
      "id, name, phone, email, address, customer_type, notes, created_at",
      { count: "exact" },
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw new Error(error.message);

  return { customers: (data ?? []) as CustomerRow[], count: count ?? 0 };
}

export async function getCustomerById(
  supabase: SupabaseClient,
  companyId: string,
  id: string,
): Promise<CustomerRow | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, email, address, customer_type, notes, created_at")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CustomerRow | null;
}

export async function getCustomerLinkedCounts(
  supabase: SupabaseClient,
  companyId: string,
  id: string,
): Promise<{ leadsCount: number; jobsCount: number; followUpsCount: number }> {
  const [leadsResult, jobsResult, followUpsResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id)
      .eq("company_id", companyId),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id)
      .eq("company_id", companyId),
    supabase
      .from("follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id)
      .eq("company_id", companyId),
  ]);

  return {
    leadsCount: leadsResult.count ?? 0,
    jobsCount: jobsResult.count ?? 0,
    followUpsCount: followUpsResult.count ?? 0,
  };
}
