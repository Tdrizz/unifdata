import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAppUser } from "@/lib/auth/session";

export async function GET(request: Request) {
  const supabase = await createClient();
  const user = await requireAppUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/sign-in?error=invite_failed", request.url),
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.profileId)
    .maybeSingle();

  const companyId = user.invitationCompanyId;

  if (!profile || !companyId) {
    return NextResponse.redirect(
      new URL("/onboarding", request.url),
    );
  }

  const { error: memberError } = await supabase
    .from("company_members")
    .upsert(
      {
        user_id: user.profileId,
        company_id: companyId,
        role: user.invitationRole ?? "member",
      },
      { onConflict: "user_id,company_id" },
    );

  if (memberError) {
    return NextResponse.redirect(
      new URL("/sign-in?error=invite_failed", request.url),
    );
  }

  return NextResponse.redirect(new URL("/workspace", request.url));
}
