import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
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

  return (data ?? []) as SettingsIntegration[];
}

export async function getTeamMembers(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("user_id, role, profiles(full_name)")
    .eq("company_id", companyId);

  return (data ?? []) as Array<{
    user_id: string;
    role: string;
    profiles: { full_name: string | null } | null;
  }>;
}
