"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany, getCurrentCompanyId, getCurrentUserRole } from "@/lib/current-company";
import { industryProfiles } from "@/lib/industry-profiles";

const validBusinessSectors = new Set(Object.keys(industryProfiles));

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeHexColor(value: string, fallback: string) {
  const color = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color.toLowerCase();
  }

  return fallback;
}

export async function updateWorkspaceAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const currentCompany = await getCurrentCompany();

  if (!currentCompany) {
    redirect("/onboarding");
  }

  const { company } = currentCompany;

  const name = getFormString(formData, "name");
  const rawSector = getFormString(formData, "business_sector");
  const businessSector = validBusinessSectors.has(rawSector)
    ? rawSector
    : "general";

  const brandColor = normalizeHexColor(
    getFormString(formData, "brand_color"),
    "#1D2D3E",
  );

  const accentColor = normalizeHexColor(
    getFormString(formData, "accent_color"),
    "#4A3FA8",
  );

  if (!name) {
    throw new Error("Business name is required.");
  }

  const { data: member, error: memberError } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("company_id", company.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    throw new Error(memberError.message);
  }

  if (!member) {
    throw new Error("You are not a member of this workspace.");
  }

  const { data: updatedCompany, error } = await supabase
    .from("companies")
    .update({
      name,
      business_sector: businessSector,
      brand_color: brandColor,
      accent_color: accentColor,
    })
    .eq("id", company.id)
    .select("id, name, business_sector, brand_color, accent_color")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!updatedCompany) {
    throw new Error(
      "Settings could not be saved. Please try again or contact support if the issue persists.",
    );
  }

  revalidatePath("/settings");
  revalidatePath("/workspace");
  revalidatePath("/", "layout");

  redirect("/settings?toast=Settings+saved");
}

export async function signOutAction() {
  redirect("/sign-in");
}

export async function changePasswordAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!currentPassword || !newPassword) {
    redirect("/settings?error=Both+current+and+new+password+are+required.");
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (signInError) {
    redirect("/settings?error=Current+password+is+incorrect.");
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

  if (updateError) {
    redirect(`/settings?error=${encodeURIComponent(updateError.message)}`);
  }

  redirect("/settings?toast=Password+updated");
}

export async function inviteMember(email: string, role: "owner" | "member" = "member") {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error("Unauthorized");

  const currentRole = await getCurrentUserRole();
  if (currentRole !== "owner") throw new Error("Only owners can invite members");

  const currentCompany = await getCurrentCompany();
  const companyName = currentCompany?.company.name ?? "your team";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const normalizedEmail = email.toLowerCase().trim();

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { error: insertError } = await admin
    .from("company_invitations")
    .insert({
      company_id: companyId,
      email: normalizedEmail,
      role,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

  if (insertError) throw new Error("Could not create invitation. Please try again.");

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const inviteUrl = `${appUrl}/invite/accept?token=${token}`;
  const fromHost = appUrl ? new URL(appUrl).hostname : "unifdata.com";
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? `noreply@${fromHost}`;

  const { error: emailError } = await resend.emails.send({
    from: `UnifData <${fromEmail}>`,
    to: normalizedEmail,
    subject: `You've been invited to join ${companyName} on UnifData`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#a09b91;">UnifData</p>
        <h2 style="margin:0 0 8px;font-size:20px;color:#171614;">You've been invited</h2>
        <p style="margin:0 0 24px;font-size:14px;color:#6b6760;line-height:1.6;">
          You've been invited to join <strong style="color:#171614;">${companyName}</strong> on UnifData as a <strong style="color:#171614;">${role}</strong>.
        </p>
        <a href="${inviteUrl}" style="display:inline-block;background:#4A3FA8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
          Accept invitation →
        </a>
        <p style="margin:20px 0 0;font-size:12px;color:#a09b91;">
          This link expires in 7 days. If you weren't expecting this, you can ignore it.
        </p>
      </div>
    `,
  });

  if (emailError) {
    await admin.from("company_invitations").delete().eq("token", token);
    throw new Error("Could not send invitation email. Please try again.");
  }

  revalidatePath("/settings");
  return { ok: true as const };
}

export async function createApiKey(name: string): Promise<{ key: string; id: string }> {
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");

  const role = await getCurrentUserRole();
  if (role !== "owner" && role !== "admin") throw new Error("Only admins can create API keys");

  const { randomBytes, createHash } = await import("crypto");
  const rawKey = `fo_live_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({ company_id: currentCompany.company.id, key_hash: keyHash, name: name.trim() || "API Key" })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create API key");

  revalidatePath("/settings");
  return { key: rawKey, id: (data as { id: string }).id };
}

export async function revokeApiKey(id: string): Promise<void> {
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");

  const role = await getCurrentUserRole();
  if (role !== "owner" && role !== "admin") throw new Error("Only admins can revoke API keys");

  const supabase = await createClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", currentCompany.company.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function disconnectIntegrationAction(provider: string): Promise<void> {
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from("integrations")
    .delete()
    .eq("company_id", currentCompany.company.id)
    .eq("provider", provider);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/imports");
}

export async function updateNotificationPreference(key: string, value: boolean): Promise<void> {
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: row } = await supabase
    .from("companies")
    .select("notification_preferences")
    .eq("id", currentCompany.company.id)
    .single();

  const current = (row?.notification_preferences ?? {}) as Record<string, boolean>;
  const { error } = await supabase
    .from("companies")
    .update({ notification_preferences: { ...current, [key]: value } })
    .eq("id", currentCompany.company.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function deleteWorkspaceAction(): Promise<void> {
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");

  const role = await getCurrentUserRole();
  if (role !== "owner") throw new Error("Only the workspace owner can delete it");

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ status: "deleted" })
    .eq("id", currentCompany.company.id);

  if (error) throw new Error(error.message);

  redirect("/sign-in?workspace_deleted=1");
}

export async function removeMember(targetUserId: string) {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error("Unauthorized");

  const role = await getCurrentUserRole();
  if (role !== "owner") throw new Error("Only owners can remove members");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === targetUserId) throw new Error("Cannot remove yourself");

  const { error } = await supabase
    .from("company_members")
    .delete()
    .eq("user_id", targetUserId)
    .eq("company_id", companyId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}
