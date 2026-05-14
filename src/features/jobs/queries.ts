import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobListRow, CustomerRow, LeadRow } from "./types";

type JobsPageOpts = { q?: string; page?: number; pageSize?: number };

export async function getJobsPageData(
  supabase: SupabaseClient,
  companyId: string,
  opts: JobsPageOpts = {},
) {
  const { q, page = 1, pageSize = 50 } = opts;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("jobs")
    .select(
      "id, customer_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at",
      { count: "exact" },
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `service_type.ilike.%${q}%,status.ilike.%${q}%,paid_status.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw new Error(error.message);

  return { jobs: (data ?? []) as JobListRow[], count: count ?? 0 };
}

export async function getJobById(
  supabase: SupabaseClient,
  companyId: string,
  id: string,
): Promise<JobListRow | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, customer_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at",
    )
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as JobListRow | null;
}

export async function getCustomersForJobSelect(
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

export async function getLeadsForJobSelect(
  supabase: SupabaseClient,
  companyId: string,
) {
  const { data, error } = await supabase
    .from("leads")
    .select("id, service_requested, status, estimated_value")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<
    LeadRow,
    "id" | "service_requested" | "status" | "estimated_value"
  >[];
}
