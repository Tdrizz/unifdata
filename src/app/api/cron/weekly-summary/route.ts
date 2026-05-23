import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWeeklySummary } from "@/lib/agents/weekly-summary";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch all Pro orgs with their owner email via company_members → profiles join
  const { data: proOrgs } = await supabase
    .from("companies")
    .select(
      `
      id,
      name,
      tier,
      company_members (
        role,
        profiles (
          email
        )
      )
    `,
    )
    .eq("tier", "pro");

  if (!proOrgs || proOrgs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const org of proOrgs) {
    // Find the owner member's email
    const members = Array.isArray(org.company_members) ? org.company_members : [];
    const ownerMember = members.find((m) => m.role === "owner") ?? members[0];

    if (!ownerMember) continue;

    const profileRaw = ownerMember.profiles;
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    const ownerEmail = profile?.email ?? null;

    if (!ownerEmail) continue;

    try {
      await sendWeeklySummary(org.id, ownerEmail, supabase);
      sent++;
    } catch (err) {
      errors.push(`${org.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, sent, errors: errors.length > 0 ? errors : undefined });
}
