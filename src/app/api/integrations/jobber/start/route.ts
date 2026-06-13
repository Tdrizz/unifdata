import { NextResponse } from "next/server";
import { getCurrentCompanyId } from "@/lib/current-company";

export async function GET(request: Request) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const clientId = process.env.JOBBER_CLIENT_ID;

    if (!clientId) {
      return NextResponse.redirect(
        new URL("/settings?error=missing_jobber_client_id", request.url),
      );
    }

    const state = `${crypto.randomUUID()}:${companyId}`;
    const redirectUri = `${new URL(request.url).origin}/api/integrations/jobber/callback`;

    const authUrl = new URL("https://api.getjobber.com/api/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl);

    response.cookies.set("frontierops_jobber_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (err instanceof Error && (err as any).digest?.startsWith("NEXT_REDIRECT")) throw err;
    console.error("[jobber-start]", err);
    return NextResponse.redirect(new URL("/settings?error=internal_error", request.url));
  }
}
