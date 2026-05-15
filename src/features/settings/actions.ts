"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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
    redirect("/login");
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
    "#7A8C2A",
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
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/login");
}

export async function changePasswordAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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

  const supabase = createServiceClient();

  const { error } = await (supabase.auth.admin as any).inviteUserByEmail(email, {
    data: { company_id: companyId, invited_role: role },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept`,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true as const };
}

export async function removeMember(targetUserId: string) {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error("Unauthorized");

  const role = await getCurrentUserRole();
  if (role !== "owner") throw new Error("Only owners can remove members");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === targetUserId) throw new Error("Cannot remove yourself");

  await supabase
    .from("company_members")
    .delete()
    .eq("user_id", targetUserId)
    .eq("company_id", companyId);

  revalidatePath("/settings");
}
