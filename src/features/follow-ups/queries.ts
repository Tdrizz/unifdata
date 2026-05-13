import type { SupabaseClient } from "@supabase/supabase-js";
import type { FollowUpRow, LeadRow, CustomerRow } from "./types";

export async function getFollowUpPageData(
  supabase: SupabaseClient,
  companyId: string,
) {
  const [followUpsResult, opportunitiesResult, peopleResult] = await Promise.all([
    supabase
      .from("follow_ups")
      .select("id, customer_id, message, due_date, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("leads")
      .select("id, customer_id, service_requested, status, next_follow_up_date, source, estimated_value, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  if (followUpsResult.error) throw new Error(followUpsResult.error.message);
  if (opportunitiesResult.error) throw new Error(opportunitiesResult.error.message);
  if (peopleResult.error) throw new Error(peopleResult.error.message);

  return {
    followUps: (followUpsResult.data ?? []) as FollowUpRow[],
    opportunities: (opportunitiesResult.data ?? []) as LeadRow[],
    people: (peopleResult.data ?? []) as Pick<CustomerRow, "id" | "name" | "email" | "phone">[],
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
): Promise<Pick<CustomerRow, "id" | "name" | "email" | "phone">[]> {
  const { data } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(500);
  return (data ?? []) as Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
}
