import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export type AppUser = {
  clerkUserId: string;
  profileId: string;
  email: string;
  fullName: string | null;
  subscribed: boolean;
  invitationCompanyId: string | null;
  invitationRole: "owner" | "admin" | "member" | null;
};

function isSubscribed(metadata: Record<string, unknown> | null | undefined) {
  return metadata?.subscribed === true;
}

function getStringMetadata(
  publicMetadata: Record<string, unknown> | null | undefined,
  privateMetadata: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = publicMetadata?.[key] ?? privateMetadata?.[key];
  return typeof value === "string" ? value : null;
}

function getInvitationRole(
  publicMetadata: Record<string, unknown> | null | undefined,
  privateMetadata: Record<string, unknown> | null | undefined,
) {
  const role = getStringMetadata(publicMetadata, privateMetadata, "invited_role");

  return role === "owner" || role === "admin" || role === "member"
    ? role
    : null;
}

export async function getCurrentAppUser(): Promise<AppUser | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();

  if (!user) {
    return null;
  }

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const fullName = user.fullName || user.username || null;
  const supabase = createAdminClient();

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, clerk_user_id, email, full_name")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const subscribed =
    isSubscribed(user.publicMetadata) || isSubscribed(user.privateMetadata);
  const invitationCompanyId = getStringMetadata(
    user.publicMetadata,
    user.privateMetadata,
    "company_id",
  );
  const invitationRole = getInvitationRole(
    user.publicMetadata,
    user.privateMetadata,
  );

  if (existingProfile) {
    const shouldSync =
      existingProfile.email !== email || existingProfile.full_name !== fullName;

    if (shouldSync) {
      await supabase
        .from("profiles")
        .update({ email, full_name: fullName })
        .eq("id", existingProfile.id);
    }

    return {
      clerkUserId: userId,
      profileId: existingProfile.id,
      email,
      fullName,
      subscribed,
      invitationCompanyId,
      invitationRole,
    };
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      clerk_user_id: userId,
      email,
      full_name: fullName,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    clerkUserId: userId,
    profileId: insertedProfile.id,
    email,
    fullName,
    subscribed,
    invitationCompanyId,
    invitationRole,
  };
}

export async function requireAppUser() {
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function requireSubscription() {
  const user = await requireAppUser();

  if (!user.subscribed) {
    redirect("/pricing");
  }

  return user;
}
