import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import { exchangeJobberCode } from "@/lib/integrations/jobber";

const SYNC_RECORD_TYPES = [
  { recordType: "relationships", label: "Clients" },
  { recordType: "work", label: "Jobs" },
  { recordType: "opportunities", label: "Quotes" },
  { recordType: "revenue", label: "Invoices" },
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

  const savedState = (await cookies()).get("frontierops_jobber_oauth_state")?.value;

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
  if (!companyId) return NextResponse.redirect(new URL("/sign-in", request.url));

  const stateCompanyId = state?.split(":")[1];
  if (!stateCompanyId || stateCompanyId !== companyId) {
    return NextResponse.redirect(new URL("/settings?error=invalid_state", request.url));
  }

  const redirectUri = `${requestUrl.origin}/api/integrations/jobber/callback`;
  const tokenData = await exchangeJobberCode(code, redirectUri);

  if (!tokenData.access_token) {
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent(tokenData.error_description || tokenData.error || "token_exchange_failed")}`,
        request.url,
      ),
    );
  }

  // Fetch account name from Jobber
  let accountName = "Jobber Account";
  try {
    const infoRes = await fetch("https://api.getjobber.com/api/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
        "X-JOBBER-GRAPHQL-VERSION": "2024-01-10",
      },
      body: JSON.stringify({ query: "{ account { name } }" }),
    });
    if (infoRes.ok) {
      const info = (await infoRes.json()) as { data?: { account?: { name?: string } } };
      accountName = info.data?.account?.name || accountName;
    }
  } catch {
    // non-fatal
  }

  const supabase = await createClient();

  await supabase
    .from("integrations")
    .delete()
    .eq("company_id", companyId)
    .eq("provider", "jobber");

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  const { data: integration, error: integrationError } = await supabase
    .from("integrations")
    .insert({
      company_id: companyId,
      provider: "jobber",
      provider_account_name: accountName,
      status: "active",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: expiresAt,
      metadata: { token_type: tokenData.token_type || null },
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
        name: `Jobber – ${label}`,
        source_type: "jobber",
        source_name: "jobber",
        record_type: recordType,
        sync_frequency: "daily",
        status: "active",
        mapping: {},
      },
      { onConflict: "company_id,source_type,record_type" },
    );
  }

  const response = NextResponse.redirect(
    new URL("/settings?connected=jobber", request.url),
  );

  response.cookies.delete("frontierops_jobber_oauth_state");

  return response;
}
