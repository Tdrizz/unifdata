import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.redirect(
      new URL("/login?error=invite_failed", request.url),
    );
  }

  const companyId = user.user_metadata?.company_id as string | undefined;
  // role will be used once Task 53 migration adds the role column to company_members
  // const role = (user.user_metadata?.invited_role as string | undefined) ?? "member";

  if (!companyId) {
    return NextResponse.redirect(
      new URL("/login?error=invite_missing_company", request.url),
    );
  }

  // Use minimal insert — role column will be added by Task 53 migration
  const { error: memberError } = await supabase
    .from("company_members")
    .upsert(
      { user_id: user.id, company_id: companyId },
      { onConflict: "user_id,company_id" },
    );

  if (memberError) {
    return NextResponse.redirect(
      new URL("/login?error=invite_failed", request.url),
    );
  }

  return NextResponse.redirect(new URL("/workspace", request.url));
}
