import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

type QBTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  x_refresh_token_expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

const SYNC_RECORD_TYPES = [
  { recordType: "relationships", label: "Customers" },
  { recordType: "revenue", label: "Invoices" },
  { recordType: "opportunities", label: "Estimates" },
] as const;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const realmId = requestUrl.searchParams.get("realmId");
  const error = requestUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error)}`, request.url),
    );
  }

  const savedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("frontierops_quickbooks_oauth_state="))
    ?.slice("frontierops_quickbooks_oauth_state=".length);

  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL("/settings?error=invalid_state", request.url),
    );
  }

  if (!code || !realmId) {
    return NextResponse.redirect(
      new URL("/settings?error=missing_code", request.url),
    );
  }

  const companyId = await getCurrentCompanyId();
  if (!companyId) return NextResponse.redirect(new URL("/login", request.url));

  const stateCompanyId = state?.split(":")[1];
  if (!stateCompanyId || stateCompanyId !== companyId) {
    return NextResponse.redirect(new URL("/settings?error=invalid_state", request.url));
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/settings?error=missing_quickbooks_env", request.url),
    );
  }

  const redirectUri = `${requestUrl.origin}/api/integrations/quickbooks/callback`;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenResponse = await fetch(
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    },
  );

  const tokenData = (await tokenResponse.json()) as QBTokenResponse;

  if (!tokenResponse.ok || !tokenData.access_token) {
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent(tokenData.error_description || tokenData.error || "token_exchange_failed")}`,
        request.url,
      ),
    );
  }

  const supabase = await createClient();

  await supabase
    .from("integrations")
    .delete()
    .eq("company_id", companyId)
    .eq("provider", "quickbooks");

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  const { data: integration, error: integrationError } = await supabase
    .from("integrations")
    .insert({
      company_id: companyId,
      provider: "quickbooks",
      provider_account_name: `QuickBooks (${realmId})`,
      status: "active",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: expiresAt,
      metadata: {
        realm_id: realmId,
        token_type: tokenData.token_type || null,
      },
    })
    .select("id")
    .single();

  if (integrationError || !integration) {
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent(integrationError?.message || "db_error")}`,
        request.url,
      ),
    );
  }

  for (const { recordType, label } of SYNC_RECORD_TYPES) {
    await supabase.from("sync_connections").upsert(
      {
        company_id: companyId,
        integration_id: integration.id,
        name: `QuickBooks – ${label}`,
        source_type: "quickbooks",
        source_name: realmId,
        record_type: recordType,
        sync_frequency: "daily",
        status: "active",
        mapping: {},
      },
      { onConflict: "company_id,source_type,record_type" },
    );
  }

  const response = NextResponse.redirect(
    new URL("/settings?connected=quickbooks", request.url),
  );

  response.cookies.delete("frontierops_quickbooks_oauth_state");

  return response;
}
