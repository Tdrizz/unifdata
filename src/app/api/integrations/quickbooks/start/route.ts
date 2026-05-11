import { NextResponse } from "next/server";
import { getCurrentCompanyId } from "@/lib/current-company";

export async function GET(request: Request) {
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/settings?error=missing_quickbooks_client_id", request.url),
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = `${new URL(request.url).origin}/api/integrations/quickbooks/callback`;

  const authUrl = new URL("https://appcenter.intuit.com/connect/oauth2");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "com.intuit.quickbooks.accounting");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);

  response.cookies.set("frontierops_quickbooks_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
