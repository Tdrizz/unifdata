import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns the contactId only if it belongs to the given company, otherwise null.
 *
 * The app's Supabase client runs with the service role (RLS bypassed), so a
 * client-supplied contact_id must be validated in application code before it is
 * written or used for activity logging — otherwise a crafted form submission
 * could attach a record to, or log activity against, another tenant's contact.
 */
export async function resolveOwnedContactId(
  supabase: SupabaseClient,
  companyId: string,
  contactId: string | null | undefined,
): Promise<string | null> {
  if (!contactId) return null;
  const { data } = await supabase
    .from("master_customers")
    .select("id")
    .eq("id", contactId)
    .eq("organization_id", companyId)
    .maybeSingle();
  return data?.id ?? null;
}
