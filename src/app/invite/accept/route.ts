import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // Legacy Clerk-metadata flow (no token in URL) — redirect to workspace
  // and let the user contact the inviter for a new link.
  if (!token) {
    return NextResponse.redirect(new URL("/workspace?error=invite_invalid", request.url));
  }

  const user = await requireAppUser();
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("company_invitations")
    .select("id, company_id, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.redirect(new URL("/workspace?error=invite_not_found", request.url));
  }

  if (invite.accepted_at) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.redirect(new URL("/workspace?error=invite_expired", request.url));
  }

  const { error: memberError } = await admin
    .from("company_members")
    .upsert(
      { user_id: user.profileId, company_id: invite.company_id, role: invite.role },
      { onConflict: "user_id,company_id" },
    );

  if (memberError) {
    return NextResponse.redirect(new URL("/workspace?error=invite_failed", request.url));
  }

  await admin
    .from("company_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.redirect(new URL("/workspace", request.url));
}
