import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import type { IntegrationRow } from "./types";

type RefreshResult = { accessToken: string; expiresAt: string | null };

const refreshers: Record<
  string,
  (integration: IntegrationRow) => Promise<RefreshResult>
> = {};

export function registerRefresher(
  provider: string,
  fn: (integration: IntegrationRow) => Promise<RefreshResult>,
) {
  refreshers[provider] = fn;
}

export async function refreshIntegrationToken(
  supabase: SupabaseClient<Database>,
  integration: IntegrationRow,
): Promise<string> {
  // Return early if token is still valid (>5 min remaining)
  if (integration.token_expires_at) {
    const expiresAt = new Date(integration.token_expires_at).getTime();
    if (expiresAt - Date.now() > 5 * 60 * 1000) {
      return integration.access_token ?? "";
    }
  }

  const refresher = refreshers[integration.provider];
  if (!refresher) return integration.access_token ?? "";

  const { accessToken, expiresAt } = await refresher(integration);

  const { error: updateError } = await supabase
    .from("integrations")
    .update({
      access_token: accessToken,
      token_expires_at: expiresAt,
    })
    .eq("id", integration.id);

  if (updateError) throw new Error(`Failed to save refreshed token: ${updateError.message}`);

  return accessToken;
}
