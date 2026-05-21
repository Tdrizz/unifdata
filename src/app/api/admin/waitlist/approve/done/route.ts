import { NextResponse } from "next/server";

export function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return new NextResponse("Server misconfiguration.", { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized.", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? "The applicant";
  const already = searchParams.get("already");

  const message = already
    ? "This request was already approved — the invite was sent previously."
    : `✓ Invite sent to ${name}. They'll receive a Clerk sign-up email now.`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invite sent</title>
<style>
  body{font-family:system-ui,sans-serif;background:#f7f6f3;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
  .card{background:#fff;border:1px solid rgba(23,22,20,0.08);border-radius:14px;padding:36px;max-width:400px;text-align:center;box-shadow:0 1px 2px rgba(23,22,20,0.04);}
  h2{margin:0 0 8px;font-size:18px;color:#171614;}
  p{margin:0 0 24px;font-size:14px;color:#6b6760;line-height:1.6;}
  a{display:inline-block;background:#171614;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;}
</style>
</head>
<body>
  <div class="card">
    <h2>${already ? "Already approved" : "Invite sent"}</h2>
    <p>${message}</p>
    <a href="/workspace">Back to UnifData</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
