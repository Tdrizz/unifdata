import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Calls set_org_scope() in the database to declare organisation context for
 * service-level operations.
 *
 * This sets a transaction-local session variable (SET LOCAL). With Supabase's
 * REST API, each top-level .from() call is a separate HTTP connection, so the
 * variable does not persist across multiple standalone queries. The primary
 * isolation guarantee for service-role clients remains the explicit
 * organization_id filter on every query; this call signals intent explicitly
 * and enables enforcement inside Postgres SECURITY DEFINER functions.
 */
export async function setOrgScope(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<void> {
  const { error } = await supabase.rpc("set_org_scope", {
    p_org_id: organizationId,
  });

  if (error) {
    console.warn("[org-scope] set_org_scope RPC failed:", error.message);
  }
}
