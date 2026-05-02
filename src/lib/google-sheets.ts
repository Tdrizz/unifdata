import type { SupabaseClient } from "@supabase/supabase-js";

type GoogleIntegration = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  provider_account_name: string | null;
};

type GoogleRefreshTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export function extractSpreadsheetId(value: string) {
  const trimmed = value.trim();

  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

  if (match?.[1]) {
    return match[1];
  }

  return trimmed.split("?")[0].trim();
}

export function escapeSheetNameForRange(sheetName: string) {
  return sheetName.replace(/'/g, "''");
}

export async function getGoogleSheetsIntegration({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient;
  companyId: string;
}) {
  const { data, error } = await supabase
    .from("integrations")
    .select(
      "id, access_token, refresh_token, token_expires_at, provider_account_name",
    )
    .eq("company_id", companyId)
    .eq("provider", "google_sheets")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as GoogleIntegration | null;
}

async function refreshGoogleAccessToken({
  supabase,
  integration,
}: {
  supabase: SupabaseClient;
  integration: GoogleIntegration;
}) {
  if (!integration.refresh_token) {
    throw new Error(
      "Google account is missing a refresh token. Reconnect Google Sheets.",
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth environment variables.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = (await response.json()) as GoogleRefreshTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Failed to refresh Google access token.",
    );
  }

  const tokenExpiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from("integrations")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token || integration.refresh_token,
      token_expires_at: tokenExpiresAt,
      metadata: {
        token_type: data.token_type || null,
        scope: data.scope || null,
        refreshed_at: new Date().toISOString(),
      },
    })
    .eq("id", integration.id);

  if (error) {
    throw new Error(error.message);
  }

  return data.access_token;
}

export async function getValidGoogleAccessToken({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient;
  companyId: string;
}) {
  const integration = await getGoogleSheetsIntegration({
    supabase,
    companyId,
  });

  if (!integration) {
    throw new Error("Google Sheets is not connected.");
  }

  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0;

  const expiresSoon = !expiresAt || expiresAt < Date.now() + 60 * 1000;

  if (!integration.access_token || expiresSoon) {
    return refreshGoogleAccessToken({
      supabase,
      integration,
    });
  }

  return integration.access_token;
}
