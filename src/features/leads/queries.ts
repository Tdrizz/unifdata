import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadRow, CustomerRow } from "./types";

type LeadsPageOpts = { q?: string; page?: number; pageSize?: number };

export async function getLeadsPageData(
  supabase: SupabaseClient,
  companyId: string,
  opts: LeadsPageOpts = {},
) {
  const { q, page = 1, pageSize = 50 } = opts;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("leads")
    .select(
      "id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, notes, created_at",
      { count: "exact" },
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `service_requested.ilike.%${q}%,source.ilike.%${q}%,status.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw new Error(error.message);

  return { leads: (data ?? []) as LeadRow[], count: count ?? 0 };
}

export async function getLeadById(
  supabase: SupabaseClient,
  companyId: string,
  id: string,
): Promise<LeadRow | null> {
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, notes, created_at",
    )
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as LeadRow | null;
}

export async function getCustomersForLeadSelect(
  supabase: SupabaseClient,
  companyId: string,
) {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
}
