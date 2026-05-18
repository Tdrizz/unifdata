import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { SettingsIntegration } from "./types";

export async function getSettingsIntegrations(
  supabase: SupabaseClient,
  companyId: string,
): Promise<SettingsIntegration[]> {
  const { data } = await supabase
    .from("integrations")
    .select("id, provider, provider_account_name, status, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(10);

  return (data ?? []) as SettingsIntegration[];
}

export async function getApiKeys(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("api_keys")
    .select("id, name, created_at, last_used_at, revoked_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Array<{
    id: string;
    name: string;
    created_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
  }>;
}

export async function getNotificationPreferences(companyId: string): Promise<Record<string, boolean>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("notification_preferences")
    .eq("id", companyId)
    .single();
  return (data?.notification_preferences ?? {
    overdue_followups: true,
    pipeline_activity: true,
    unpaid_invoices: false,
    ai_brief: true,
  }) as Record<string, boolean>;
}

export async function getTeamMembers(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("user_id, role, profiles(full_name)")
    .eq("company_id", companyId);

  return (data ?? []) as unknown as Array<{
    user_id: string;
    role: string;
    profiles: { full_name: string | null } | null;
  }>;
}
