import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verify that a row identified by `id` in `table` belongs to the caller's company.
 *
 * The app uses the Supabase service-role client, which bypasses RLS — so any
 * client- or model-supplied foreign key (customer_id, lead_id, board_id, …) must
 * be confirmed to belong to the caller's org BEFORE it is written or embedded in
 * a join, or a row could reference (and later leak, via an embed) another tenant's
 * data. Returns false for a missing id or a row that isn't owned.
 */
export async function verifyOwned(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  table: string,
  id: string | null | undefined,
  companyId: string,
  orgColumn: "company_id" | "organization_id" = "company_id",
): Promise<boolean> {
  if (!id) return false;
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq(orgColumn, companyId)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Verify the current user is a member of `companyId`. Use in server actions that
 * would otherwise trust a client-supplied company/organization id. Prefer
 * deriving the company from the session (`getCurrentCompanyId`) where possible;
 * use this when an id must be accepted as a parameter.
 */
export async function isCompanyMember(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  companyId: string,
  profileId: string,
): Promise<boolean> {
  if (!companyId || !profileId) return false;
  const { data } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", profileId)
    .eq("company_id", companyId)
    .maybeSingle();
  return Boolean(data);
}
