import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import { exchangeHubSpotCode } from "@/lib/integrations/hubspot";

const SYNC_RECORD_TYPES = [
  { recordType: "relationships", label: "Contacts" },
  { recordType: "opportunities", label: "Deals" },
] as const;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
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
    .find((c) => c.startsWith("frontierops_hubspot_oauth_state="))
    ?.slice("frontierops_hubspot_oauth_state=".length);

  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL("/settings?error=invalid_state", request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?error=missing_code", request.url),
    );
  }

  const companyId = await getCurrentCompanyId();
  if (!companyId) return NextResponse.redirect(new URL("/login", request.url));

  const redirectUri = `${requestUrl.origin}/api/integrations/hubspot/callback`;
  const tokenData = await exchangeHubSpotCode(code, redirectUri);

  if (!tokenData.access_token) {
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent(tokenData.error_description || tokenData.message || tokenData.error || "token_exchange_failed")}`,
        request.url,
      ),
    );
  }

  // Fetch HubSpot account info for a friendly display name
  let accountName = "HubSpot Account";
  try {
    const infoRes = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + tokenData.access_token);
    if (infoRes.ok) {
      const info = (await infoRes.json()) as { hub_domain?: string; user?: string };
      accountName = info.hub_domain || info.user || accountName;
    }
  } catch {
    // non-fatal
  }

  const supabase = await createClient();

  await supabase
    .from("integrations")
    .delete()
    .eq("company_id", companyId)
    .eq("provider", "hubspot");

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  const { data: integration, error: integrationError } = await supabase
    .from("integrations")
    .insert({
      company_id: companyId,
      provider: "hubspot",
      provider_account_name: accountName,
      status: "active",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: expiresAt,
      metadata: {
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
        name: `HubSpot – ${label}`,
        source_type: "hubspot",
        source_name: "hubspot",
        record_type: recordType,
        sync_frequency: "daily",
        status: "active",
        mapping: {},
      },
      { onConflict: "company_id,source_type,record_type" },
    );
  }

  const response = NextResponse.redirect(
    new URL("/settings?connected=hubspot", request.url),
  );

  response.cookies.delete("frontierops_hubspot_oauth_state");

  return response;
}
