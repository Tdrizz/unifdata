import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import { exchangeSquareCode } from "@/lib/integrations/square";

const SYNC_RECORD_TYPES = [
  { recordType: "relationships", label: "Customers" },
  { recordType: "revenue", label: "Payments" },
] as const;

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

  const savedState = (await cookies()).get("frontierops_square_oauth_state")?.value;

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

  const stateCompanyId = state?.split(":")[1];
  if (!stateCompanyId || stateCompanyId !== companyId) {
    return NextResponse.redirect(new URL("/settings?error=invalid_state", request.url));
  }

  const redirectUri = `${requestUrl.origin}/api/integrations/square/callback`;
  const tokenData = await exchangeSquareCode(code, redirectUri);

  if (!tokenData.access_token) {
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent(tokenData.errors?.[0]?.detail || "token_exchange_failed")}`,
        request.url,
      ),
    );
  }

  const supabase = await createClient();

  await supabase
    .from("integrations")
    .delete()
    .eq("company_id", companyId)
    .eq("provider", "square");

  const { data: integration, error: integrationError } = await supabase
    .from("integrations")
    .insert({
      company_id: companyId,
      provider: "square",
      provider_account_name: tokenData.merchant_id
        ? `Square (${tokenData.merchant_id})`
        : "Square Account",
      status: "active",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: tokenData.expires_at || null,
      metadata: {
        merchant_id: tokenData.merchant_id || null,
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
        name: `Square – ${label}`,
        source_type: "square",
        source_name: "square",
        record_type: recordType,
        sync_frequency: "daily",
        status: "active",
        mapping: {},
      },
      { onConflict: "company_id,source_type,record_type" },
    );
  }

  const response = NextResponse.redirect(
    new URL("/settings?connected=square", request.url),
  );

  response.cookies.delete("frontierops_square_oauth_state");

  return response;
}
