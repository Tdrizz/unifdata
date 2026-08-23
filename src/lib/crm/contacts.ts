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

/**
 * Point lookup for one already-linked contact's display info, org-scoped.
 * Used by edit forms to pre-fill ContactCombobox's default selection instead
 * of fetching every contact in the workspace (the old getCustomersFor*Select
 * functions all capped at 500 rows, so a linked contact past that cap could
 * silently disappear from an edit form's picker).
 */
export async function getContactForSelect(
  supabase: SupabaseClient,
  companyId: string,
  contactId: string | null | undefined,
): Promise<{ id: string; name: string; email: string | null; phone: string | null } | null> {
  if (!contactId) return null;
  const { data } = await supabase
    .from("master_customers")
    .select("id, first_name, last_name, primary_email, primary_phone")
    .eq("id", contactId)
    .eq("organization_id", companyId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    name: [data.first_name, data.last_name].filter(Boolean).join(" "),
    email: data.primary_email,
    phone: data.primary_phone,
  };
}
