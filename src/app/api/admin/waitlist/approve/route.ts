import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getCurrentAppUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      // Redirect to sign-in preserving the full approve URL so Clerk bounces back here
      const approveUrl = new URL(request.url).pathname + new URL(request.url).search;
      return NextResponse.redirect(
        new URL(`/sign-in?redirect_url=${encodeURIComponent(approveUrl)}`, request.url),
      );
    }

    const user = await getCurrentAppUser();
    if (!user) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Only admin emails can approve — configure via ADMIN_EMAILS env var (comma-separated)
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (!adminEmails.includes(user.email)) {
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
