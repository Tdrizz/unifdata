import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
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

  const { data, count } = await query.range(from, to);

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

  if (error) return null;
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

export async function findDuplicateCustomers(companyId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId);

  if (!data || data.length === 0) return [];

  const byEmail = new Map<string, typeof data>();
  const byPhone = new Map<string, typeof data>();

  for (const customer of data) {
    if (customer.email) {
      const key = customer.email.toLowerCase().trim();
      if (!byEmail.has(key)) byEmail.set(key, []);
      byEmail.get(key)!.push(customer);
    }
    if (customer.phone) {
      const key = customer.phone.replace(/\D/g, "");
      if (key.length >= 7) {
        if (!byPhone.has(key)) byPhone.set(key, []);
        byPhone.get(key)!.push(customer);
      }
    }
  }

  const groups: Array<{
    key: string;
    type: "email" | "phone";
    customers: typeof data;
  }> = [];
  const seenIds = new Set<string>();

  for (const [key, customers] of byEmail.entries()) {
    if (customers.length < 2) continue;
    const ids = customers
      .map((c) => c.id)
      .sort()
      .join(",");
    if (seenIds.has(ids)) continue;
    seenIds.add(ids);
    groups.push({ key, type: "email", customers });
  }

  for (const [key, customers] of byPhone.entries()) {
    if (customers.length < 2) continue;
    const ids = customers
      .map((c) => c.id)
      .sort()
      .join(",");
    if (seenIds.has(ids)) continue;
    seenIds.add(ids);
    groups.push({ key, type: "phone", customers });
  }

  return groups;
}
