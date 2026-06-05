import type { SupabaseClient } from "@supabase/supabase-js";
import type { FollowUpRow, LeadRow } from "./types";
import type { ContactForSelect } from "@/lib/crm/types";

export async function getFollowUpPageData(
  supabase: SupabaseClient,
  companyId: string,
  page = 1,
) {
  const from = (page - 1) * 50;
  const to = page * 50 - 1;
  const [followUpsResult, opportunitiesResult, peopleResult] = await Promise.all([
    supabase
      .from("follow_ups")
      .select("id, customer_id, contact_id, message, due_date, status, created_at", { count: "exact" })
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("leads")
      .select("id, customer_id, service_requested, status, next_follow_up_date, source, estimated_value, created_at", { count: "exact" })
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("master_customers")
      .select("id, first_name, last_name, primary_email, primary_phone")
      .eq("organization_id", companyId)
      .order("first_name", { ascending: true })
      .limit(250),
  ]);

  const rawPeople = (peopleResult.data ?? []) as Array<{ id: string; first_name: string; last_name: string | null; primary_email: string | null; primary_phone: string | null }>;
  const people: ContactForSelect[] = rawPeople.map((r) => ({
    id: r.id,
    name: [r.first_name, r.last_name].filter(Boolean).join(" "),
    email: r.primary_email,
    phone: r.primary_phone,
  }));

  return {
    followUps: (followUpsResult.data ?? []) as FollowUpRow[],
    opportunities: (opportunitiesResult.data ?? []) as LeadRow[],
    people,
    count: followUpsResult.count ?? 0,
  };
}

export async function getFollowUpById(
  supabase: SupabaseClient,
  companyId: string,
  id: string,
): Promise<FollowUpRow | null> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as FollowUpRow;
}

export async function getCustomersForSelect(
  supabase: SupabaseClient,
  companyId: string,
): Promise<ContactForSelect[]> {
  const { data } = await supabase
    .from("master_customers")
    .select("id, first_name, last_name, primary_email, primary_phone")
    .eq("organization_id", companyId)
    .order("first_name", { ascending: true })
    .limit(500);

  return ((data ?? []) as Array<{ id: string; first_name: string; last_name: string | null; primary_email: string | null; primary_phone: string | null }>).map((r) => ({
    id: r.id,
    name: [r.first_name, r.last_name].filter(Boolean).join(" "),
    email: r.primary_email,
    phone: r.primary_phone,
  }));
}
