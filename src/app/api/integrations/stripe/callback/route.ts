import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import { exchangeStripeCode } from "@/lib/integrations/stripe";

const SYNC_RECORD_TYPES = ["relationships", "revenue"] as const;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent(errorDescription || error)}`,
        request.url,
      ),
    );
  }

  const savedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("frontierops_stripe_oauth_state="))
    ?.split("=")[1];

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

  const tokenData = await exchangeStripeCode(code);

  if (!tokenData.access_token) {
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
    .eq("provider", "stripe");

  const { data: integration, error: integrationError } = await supabase
    .from("integrations")
    .insert({
      company_id: companyId,
      provider: "stripe",
      provider_account_name: tokenData.stripe_user_id || "Stripe Account",
      status: "active",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: null,
      metadata: {
        stripe_user_id: tokenData.stripe_user_id || null,
        livemode: tokenData.livemode ?? true,
        scope: tokenData.scope || null,
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

  // Create sync_connections for each record type so auto-sync can run
  for (const recordType of SYNC_RECORD_TYPES) {
    await supabase.from("sync_connections").upsert(
      {
        company_id: companyId,
        integration_id: integration.id,
        name: `Stripe – ${recordType === "relationships" ? "Customers" : "Payments"}`,
        source_type: "stripe",
        source_name: "stripe",
        record_type: recordType,
        sync_frequency: "daily",
        status: "active",
        mapping: {},
      },
      { onConflict: "company_id,source_type,record_type" },
    );
  }

  const response = NextResponse.redirect(
    new URL("/settings?connected=stripe", request.url),
  );

  response.cookies.delete("frontierops_stripe_oauth_state");

  return response;
}
