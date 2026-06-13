import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
  name?: string;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/imports?google_error=${encodeURIComponent(error)}`,
        request.url,
      ),
    );
  }

  const savedState = (await cookies()).get("frontierops_google_oauth_state")?.value;

  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL("/imports?google_error=invalid_state", request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/imports?google_error=missing_code", request.url),
    );
  }

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Verify the companyId embedded in state matches the current session
  const stateCompanyId = state.split(":")[1];
  if (!stateCompanyId || stateCompanyId !== companyId) {
    return NextResponse.redirect(
      new URL("/imports?google_error=invalid_state", request.url),
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/imports?google_error=missing_google_env", request.url),
    );
  }

  const redirectUri = `${requestUrl.origin}/api/integrations/google/callback`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

  if (!tokenResponse.ok || !tokenData.access_token) {
    return NextResponse.redirect(
      new URL(
        `/imports?google_error=${encodeURIComponent(
          tokenData.error_description ||
            tokenData.error ||
            "token_exchange_failed",
        )}`,
        request.url,
      ),
    );
  }

  let accountName = "Google Sheets";

  try {
    const userInfoResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    );

    if (userInfoResponse.ok) {
      const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;
      accountName = userInfo.email || userInfo.name || accountName;
    }
  } catch {
    accountName = "Google Sheets";
  }

  const supabase = await createClient();

  await supabase
    .from("integrations")
    .delete()
    .eq("company_id", companyId)
    .eq("provider", "google_sheets");

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  const { error: integrationError } = await supabase
    .from("integrations")
    .insert({
      company_id: companyId,
      provider: "google_sheets",
      provider_account_name: accountName,
      status: "active",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: expiresAt,
      metadata: {
        scope: tokenData.scope || null,
        token_type: tokenData.token_type || null,
      },
    });

  if (integrationError) {
    return NextResponse.redirect(
      new URL(
        `/imports?google_error=${encodeURIComponent(integrationError.message)}`,
        request.url,
      ),
    );
  }

  const response = NextResponse.redirect(
    new URL("/imports?google=connected", request.url),
  );

  response.cookies.delete("frontierops_google_oauth_state");

  return response;
}
