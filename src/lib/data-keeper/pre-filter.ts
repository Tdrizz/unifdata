import { createAdminClient } from "@/lib/supabase/admin";
import type { MasterCustomerCandidate, NormalizedPayload } from "./types";

export async function fetchTopMatchCandidates(
  organizationId: string,
  payload: NormalizedPayload,
  excludeId?: string,
): Promise<MasterCustomerCandidate[]> {
  const supabase = createAdminClient();

  const email = payload.email ?? "";
  const phone = payload.phone ?? "";
  const fullName = payload.fullName ?? "";

  // Use pg_trgm GIN indexes already built in migration 011.
  // Priority order: exact email match → exact phone match → name similarity.
  const { data, error } = await supabase.rpc("fetch_master_customer_candidates", {
    p_org_id: organizationId,
    p_email: email,
    p_phone: phone,
    p_full_name: fullName,
  });

  if (error) {
    // Fallback: basic query without similarity ordering if RPC not available
    let fallbackQuery = supabase
      .from("master_customers")
      .select(
        "id, first_name, last_name, primary_email, primary_phone, billing_address, service_address, metadata, data_health_score",
      )
      .eq("organization_id", organizationId);

    if (email) fallbackQuery = fallbackQuery.eq("primary_email", email);
    else if (phone) fallbackQuery = fallbackQuery.eq("primary_phone", phone);

    if (excludeId) fallbackQuery = fallbackQuery.neq("id", excludeId);

    const { data: fallback } = await fallbackQuery.limit(5);
    return (fallback ?? []) as MasterCustomerCandidate[];
  }

  const candidates = (data ?? []) as MasterCustomerCandidate[];
  return excludeId ? candidates.filter((c) => c.id !== excludeId) : candidates;
}
