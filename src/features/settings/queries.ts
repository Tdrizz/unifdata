import type { SupabaseClient } from "@supabase/supabase-js";
import type { SettingsIntegration } from "./types";

export async function getSettingsIntegrations(
  supabase: SupabaseClient,
  companyId: string,
): Promise<SettingsIntegration[]> {
  const { data, error } = await supabase
    .from("integrations")
    .select("id, provider, provider_account_name, status, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);

  return (data ?? []) as SettingsIntegration[];
}
