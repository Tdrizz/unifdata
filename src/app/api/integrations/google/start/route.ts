import { NextResponse } from "next/server";
import { getCurrentCompanyId } from "@/lib/current-company";

const googleScopes = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

export async function GET(request: Request) {
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/imports?google_error=missing_client_id", request.url),
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = `${new URL(request.url).origin}/api/integrations/google/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", googleScopes.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);

  response.cookies.set("frontierops_google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
