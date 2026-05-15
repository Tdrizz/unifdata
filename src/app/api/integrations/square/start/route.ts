import { NextResponse } from "next/server";
import { getCurrentCompanyId } from "@/lib/current-company";

export async function GET(request: Request) {
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.SQUARE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/settings?error=missing_square_client_id", request.url),
    );
  }

  const state = `${crypto.randomUUID()}:${companyId}`;
  const redirectUri = `${new URL(request.url).origin}/api/integrations/square/callback`;

  const authUrl = new URL("https://connect.squareup.com/oauth2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "CUSTOMERS_READ PAYMENTS_READ");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("session", "false");

  const response = NextResponse.redirect(authUrl);

  response.cookies.set("frontierops_square_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
