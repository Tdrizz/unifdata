import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAppUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Must be logged in — link in the email sends you to sign-in first if needed
    const user = await requireAppUser();

    // Only the owner email can approve
    if (!["tittanolson@gmail.com", "unifdata@gmail.com"].includes(user.email)) {
      return new Response("Unauthorized", { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response("Missing id", { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: row, error } = await supabase
      .from("waitlist_requests")
      .select("id, email, name, status")
      .eq("id", id)
      .single();

    if (error || !row) {
      return new Response("Request not found", { status: 404 });
    }

    if (row.status === "invited") {
      return NextResponse.redirect(
        new URL(`/api/admin/waitlist/approve/done?already=1`, request.url),
      );
    }

    // Send Clerk invitation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    const clerk = await clerkClient();
    await clerk.invitations.createInvitation({
      emailAddress: row.email,
      redirectUrl: `${appUrl}/subscribe`,
      notify: true,
      ignoreExisting: true,
    });

    // Mark as invited
    await supabase
      .from("waitlist_requests")
      .update({ status: "invited" })
      .eq("id", id);

    return NextResponse.redirect(
      new URL(`/api/admin/waitlist/approve/done?name=${encodeURIComponent(row.name)}`, request.url),
    );
  } catch (err) {
    console.error("[admin.waitlist.approve]", err);
    return new Response("Error processing approval", { status: 500 });
  }
}
