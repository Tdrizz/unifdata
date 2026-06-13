// No "server-only" guard: this module is imported by conflict-resolver, which
// is covered by vitest (server-only throws outside React Server Components).
// It takes a SupabaseClient parameter and holds no credentials of its own.
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mirror a master_customers update back onto its legacy customers row.
 *
 * The legacy `customers` table still feeds the AI chat context, lead/customer
 * dropdowns, and import dedup checks. Integration webhooks and the data keeper
 * write only master_customers, so without this the legacy readers drift stale.
 *
 * Non-fatal by design: callers are webhook/queue paths where a sync miss must
 * never fail the primary write. Errors are logged and swallowed.
 */
export async function syncLegacyCustomer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  masterCustomerId: string,
): Promise<void> {
  try {
    const { data: master } = await supabase
      .from("master_customers")
      .select("legacy_customer_id, organization_id, first_name, last_name, primary_email, primary_phone")
      .eq("id", masterCustomerId)
      .maybeSingle();

    if (!master?.legacy_customer_id) return;

    const name = [master.first_name, master.last_name].filter(Boolean).join(" ").trim();

    const { error } = await supabase
      .from("customers")
      .update({
        ...(name ? { name } : {}),
        email: master.primary_email ?? null,
        phone: master.primary_phone ?? null,
      })
      .eq("id", master.legacy_customer_id)
      .eq("company_id", master.organization_id);

    if (error) {
      console.error("[legacy-sync] customers update failed", { masterCustomerId, error: error.message });
    }
  } catch (err) {
    console.error("[legacy-sync] unexpected failure", { masterCustomerId, err });
  }
}
