import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobListRow, LeadRow } from "./types";
import type { ContactForSelect } from "@/lib/crm/types";

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
      "id, customer_id, contact_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at",
      { count: "exact" },
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `service_type.ilike.%${q}%,status.ilike.%${q}%,paid_status.ilike.%${q}%`,
    );
  }

  const { data, count } = await query.range(from, to);

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
      "id, customer_id, contact_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at",
    )
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) return null;
  return data as JobListRow | null;
}

export async function getCustomersForJobSelect(
  supabase: SupabaseClient,
  companyId: string,
): Promise<ContactForSelect[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
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

export async function getLeadsForJobSelect(
  supabase: SupabaseClient,
  companyId: string,
) {
  const { data } = await supabase
    .from("leads")
    .select("id, service_requested, status, estimated_value")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(500);

  return (data ?? []) as Pick<
    LeadRow,
    "id" | "service_requested" | "status" | "estimated_value"
  >[];
}
