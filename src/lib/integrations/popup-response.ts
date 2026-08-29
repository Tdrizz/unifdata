import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// One cookie shared across every provider's OAuth flow -- a user only
// realistically has one connect flow in flight in a given browser at a
// time, and this only ever carries a boolean, so there's no value in
// per-provider popup-flag cookies the way the CSRF state cookies need to be
// (those already are, since they carry a random value that must round-trip
// through the exact provider that issued it).
const POPUP_FLAG_COOKIE = "frontierops_oauth_popup";

export function setPopupFlagCookie(response: NextResponse): void {
  response.cookies.set(POPUP_FLAG_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
}

// Every OAuth callback route ends by redirecting to /settings with a
// ?connected=<provider> or ?error=<reason> query param -- that's correct
// when the flow was a full-page navigation, but when it was started from a
// popup window (Integrations page "Connect" button), finishing with a real
// navigation leaves a stray popup sitting on /settings instead of closing
// itself and handing control back to the page that opened it.
//
// Callback routes are unchanged internally -- each one still computes and
// returns the exact same NextResponse.redirect(...) it always did, at every
// one of its several early-return branches. This wraps that single return
// value once, at the end, rather than requiring every branch in every
// provider's callback to be rewritten to know about popup mode.
export async function finalizeIntegrationResponse(
  request: Request,
  response: NextResponse,
  provider: string,
): Promise<NextResponse> {
  const isPopup = (await cookies()).get(POPUP_FLAG_COOKIE)?.value === "1";
  const location = response.headers.get("location");

  if (!isPopup || !location) {
    return response;
  }

  const target = new URL(location, request.url);
  const connected = target.searchParams.get("connected");
  const error = target.searchParams.get("error");
  // provider is always this route's own provider, even on an error path
  // (where the redirect target itself carries no ?connected= to identify
  // it) -- lets the Integrations page attribute a failure to the card that
  // actually triggered it instead of guessing from whichever card's
  // listener happens to be attached when a message arrives.
  const payload = JSON.stringify({ type: "unifdata-integration-result", provider, connected, error });

  const html = `<!doctype html>
<html>
<body style="font:14px system-ui;color:#666;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <script>
    if (window.opener) {
      window.opener.postMessage(${payload}, window.location.origin);
    }
    window.close();
  </script>
  <p>You can close this window.</p>
</body>
</html>`;

  const htmlResponse = new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  // Carry over any Set-Cookie headers the original response set (e.g. the
  // provider's own state cookie being cleared) since this is a fresh
  // NextResponse, not the one that computed them.
  for (const cookie of response.cookies.getAll()) {
    htmlResponse.cookies.set(cookie);
  }
  htmlResponse.cookies.delete(POPUP_FLAG_COOKIE);

  return htmlResponse;
}
