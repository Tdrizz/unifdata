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

export async function updateMonthlyGoalAction(goal: number): Promise<void> {
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");

  if (!Number.isFinite(goal) || goal < 0) throw new Error("Invalid goal amount");

  const supabase = await createClient();

  const { data: row } = await supabase
    .from("companies")
    .select("preferences")
    .eq("id", currentCompany.company.id)
    .single();

  const current = (row?.preferences ?? {}) as Record<string, unknown>;
  const updated = { ...current, monthly_revenue_goal: goal };
  const { error } = await supabase
    .from("companies")
    .update({ preferences: updated as Parameters<typeof supabase.from>[0] extends never ? never : unknown })
    .eq("id", currentCompany.company.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function updatePreferencesAction(key: string, value: boolean): Promise<void> {
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: row } = await supabase
    .from("companies")
    .select("preferences")
    .eq("id", currentCompany.company.id)
    .single();

  const current = (row?.preferences ?? {}) as Record<string, unknown>;
  const updated = { ...current, [key]: value };
  const { error } = await supabase
    .from("companies")
    .update({ preferences: updated as Parameters<typeof supabase.from>[0] extends never ? never : unknown })
    .eq("id", currentCompany.company.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/workspace");
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

export async function createTagAction(orgId: string, name: string, color: string): Promise<void> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany || currentCompany.company.id !== orgId) throw new Error("Unauthorized");

  const { error } = await (supabase as any)
    .from("tags")
    .insert({ organization_id: orgId, name: name.trim(), color });

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function renameTagAction(tagId: string, name: string): Promise<void> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");

  const { data: tag } = await (supabase as any)
    .from("tags")
    .select("organization_id")
    .eq("id", tagId)
    .single();

  if (!tag || tag.organization_id !== currentCompany.company.id) throw new Error("Unauthorized");

  const { error } = await (supabase as any)
    .from("tags")
    .update({ name: name.trim() })
    .eq("id", tagId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function deleteTagAction(tagId: string): Promise<void> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");

  const { data: tag } = await (supabase as any)
    .from("tags")
    .select("organization_id")
    .eq("id", tagId)
    .single();

  if (!tag || tag.organization_id !== currentCompany.company.id) throw new Error("Unauthorized");

  const { error } = await (supabase as any)
    .from("tags")
    .delete()
    .eq("id", tagId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function createCustomFieldAction(
  orgId: string,
  entityType: string,
  label: string,
  fieldType: string,
  options: string[] | null,
  required: boolean,
): Promise<void> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany || currentCompany.company.id !== orgId) throw new Error("Unauthorized");

  const { data: existing } = await (supabase as any)
    .from("custom_field_definitions")
    .select("position")
    .eq("organization_id", orgId)
    .eq("entity_type", entityType)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? (existing[0].position as number) + 1 : 0;
  const fieldKey = label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  const { error } = await (supabase as any)
    .from("custom_field_definitions")
    .insert({
      organization_id: orgId,
      entity_type: entityType,
      label: label.trim(),
      field_key: fieldKey,
      field_type: fieldType,
      options: options ?? null,
      required,
      position: nextPosition,
    });

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function updateCustomFieldAction(
  fieldId: string,
  label: string,
  fieldType: string,
  options: string[] | null,
  required: boolean,
): Promise<void> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");

  const { data: field } = await (supabase as any)
    .from("custom_field_definitions")
    .select("organization_id")
    .eq("id", fieldId)
    .single();

  if (!field || field.organization_id !== currentCompany.company.id) throw new Error("Unauthorized");

  const { error } = await (supabase as any)
    .from("custom_field_definitions")
    .update({ label: label.trim(), field_type: fieldType, options: options ?? null, required })
    .eq("id", fieldId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function deleteCustomFieldAction(fieldId: string): Promise<void> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");

  const { data: field } = await (supabase as any)
    .from("custom_field_definitions")
    .select("organization_id")
    .eq("id", fieldId)
    .single();

  if (!field || field.organization_id !== currentCompany.company.id) throw new Error("Unauthorized");

  const { error } = await (supabase as any)
    .from("custom_field_definitions")
    .delete()
    .eq("id", fieldId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function reorderCustomFieldAction(
  fieldId: string,
  orgId: string,
  entityType: string,
  direction: "up" | "down",
): Promise<void> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany || currentCompany.company.id !== orgId) throw new Error("Unauthorized");

  const { data: fields } = await (supabase as any)
    .from("custom_field_definitions")
    .select("id, position")
    .eq("organization_id", orgId)
    .eq("entity_type", entityType)
    .order("position", { ascending: true });

  if (!fields) throw new Error("Could not load fields");

  const idx = (fields as Array<{ id: string; position: number }>).findIndex((f) => f.id === fieldId);
  if (idx === -1) throw new Error("Field not found");

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= fields.length) return;

  const current = fields[idx] as { id: string; position: number };
  const swap = fields[swapIdx] as { id: string; position: number };

  await Promise.all([
    (supabase as any).from("custom_field_definitions").update({ position: swap.position }).eq("id", current.id),
    (supabase as any).from("custom_field_definitions").update({ position: current.position }).eq("id", swap.id),
  ]);

  revalidatePath("/settings");
}

export async function createBoardAction(orgId: string, name: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany || currentCompany.company.id !== orgId) return { error: "Unauthorized" };

  const { data: board, error } = await (supabase as any)
    .from("process_boards")
    .insert({ organization_id: orgId, name: name.trim() })
    .select("id")
    .single();

  if (error || !board) return { error: error?.message ?? "Failed to create board" };

  const defaultStages = [
    { name: "New", color: "#3B82F6", stage_type: "active", position: 0 },
    { name: "In Progress", color: "#F59E0B", stage_type: "active", position: 1 },
    { name: "Under Review", color: "#8B5CF6", stage_type: "active", position: 2 },
    { name: "Completed", color: "#22C55E", stage_type: "completed", position: 3 },
    { name: "Cancelled", color: "#6B7280", stage_type: "cancelled", position: 4 },
  ];

  await (supabase as any)
    .from("board_stages")
    .insert(defaultStages.map((s) => ({ ...s, board_id: (board as { id: string }).id })));

  revalidatePath("/settings");
  return { id: (board as { id: string }).id };
}

export async function renameBoardAction(boardId: string, name: string): Promise<void> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");

  const { data: board } = await (supabase as any)
    .from("process_boards")
    .select("organization_id")
    .eq("id", boardId)
    .single();

  if (!board || board.organization_id !== currentCompany.company.id) throw new Error("Unauthorized");

  const { error } = await (supabase as any)
    .from("process_boards")
    .update({ name: name.trim() })
    .eq("id", boardId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function deleteBoardAction(boardId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return { error: "Unauthorized" };

  const { data: board } = await (supabase as any)
    .from("process_boards")
    .select("organization_id")
    .eq("id", boardId)
    .single();

  if (!board || board.organization_id !== currentCompany.company.id) return { error: "Unauthorized" };

  const { count } = await (supabase as any)
    .from("process_records")
    .select("id", { count: "exact", head: true })
    .eq("board_id", boardId)
    .eq("status", "active");

  if (count && count > 0) return { error: "Move or close active records first" };

  const { error } = await (supabase as any)
    .from("process_boards")
    .delete()
    .eq("id", boardId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function createStageAction(
  boardId: string,
  orgId: string,
  name: string,
  color: string,
  stageType: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany || currentCompany.company.id !== orgId) return { error: "Unauthorized" };

  const { data: existingStages } = await (supabase as any)
    .from("board_stages")
    .select("id, stage_type, position")
    .eq("board_id", boardId)
    .order("position", { ascending: false });

  const stages = (existingStages ?? []) as Array<{ id: string; stage_type: string; position: number }>;

  if (stageType === "completed" && stages.filter((s) => s.stage_type === "completed").length >= 1) {
    return { error: "Only 1 completed stage allowed per board" };
  }
  if (stageType === "cancelled" && stages.filter((s) => s.stage_type === "cancelled").length >= 1) {
    return { error: "Only 1 cancelled stage allowed per board" };
  }

  const nextPosition = stages.length > 0 ? stages[0].position + 1 : 0;

  const { error } = await (supabase as any)
    .from("board_stages")
    .insert({ board_id: boardId, name: name.trim(), color, stage_type: stageType, position: nextPosition });

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function renameStageAction(stageId: string, name: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from("board_stages")
    .update({ name: name.trim() })
    .eq("id", stageId);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function updateStageColorAction(stageId: string, color: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from("board_stages")
    .update({ color })
    .eq("id", stageId);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function updateStageTypeAction(stageId: string, stageType: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: stage } = await (supabase as any)
    .from("board_stages")
    .select("board_id")
    .eq("id", stageId)
    .single();

  if (!stage) return { error: "Stage not found" };

  const { data: siblings } = await (supabase as any)
    .from("board_stages")
    .select("id, stage_type")
    .eq("board_id", stage.board_id)
    .neq("id", stageId);

  const others = (siblings ?? []) as Array<{ id: string; stage_type: string }>;

  if (stageType === "completed" && others.filter((s) => s.stage_type === "completed").length >= 1) {
    return { error: "Only 1 completed stage allowed per board" };
  }
  if (stageType === "cancelled" && others.filter((s) => s.stage_type === "cancelled").length >= 1) {
    return { error: "Only 1 cancelled stage allowed per board" };
  }

  const { error } = await (supabase as any)
    .from("board_stages")
    .update({ stage_type: stageType })
    .eq("id", stageId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function reorderStageAction(stageId: string, boardId: string, direction: "up" | "down"): Promise<void> {
  const supabase = await createClient();

  const { data: stages } = await (supabase as any)
    .from("board_stages")
    .select("id, position")
    .eq("board_id", boardId)
    .order("position", { ascending: true });

  if (!stages) throw new Error("Could not load stages");

  const stagesTyped = stages as Array<{ id: string; position: number }>;
  const idx = stagesTyped.findIndex((s) => s.id === stageId);
  if (idx === -1) throw new Error("Stage not found");

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= stagesTyped.length) return;

  await Promise.all([
    (supabase as any).from("board_stages").update({ position: stagesTyped[swapIdx].position }).eq("id", stagesTyped[idx].id),
    (supabase as any).from("board_stages").update({ position: stagesTyped[idx].position }).eq("id", stagesTyped[swapIdx].id),
  ]);

  revalidatePath("/settings");
}

export async function deleteStageAction(stageId: string, reassignToStageId?: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: stage } = await (supabase as any)
    .from("board_stages")
    .select("board_id")
    .eq("id", stageId)
    .single();

  if (!stage) return { error: "Stage not found" };

  const { count } = await (supabase as any)
    .from("process_records")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", stageId)
    .eq("status", "active");

  if (count && count > 0) {
    if (!reassignToStageId) return { error: "Active records exist — choose a stage to reassign them to" };

    const { error: reassignError } = await (supabase as any)
      .from("process_records")
      .update({ stage_id: reassignToStageId })
      .eq("stage_id", stageId)
      .eq("status", "active");

    if (reassignError) return { error: reassignError.message };
  }

  const { error } = await (supabase as any)
    .from("board_stages")
    .delete()
    .eq("id", stageId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function updateLabelOverrideAction(orgId: string, key: string, value: string): Promise<void> {
  const supabase = await createClient();
  const { data: co } = await supabase
    .from("companies")
    .select("profile_overrides")
    .eq("id", orgId)
    .single();
  const current = ((co as any)?.profile_overrides as Record<string, string>) ?? {};
  await supabase
    .from("companies")
    .update({ profile_overrides: { ...current, [key]: value } } as any)
    .eq("id", orgId);
  revalidatePath("/settings");
}

export async function resetLabelOverridesAction(orgId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("companies")
    .update({ profile_overrides: {} } as any)
    .eq("id", orgId);
  revalidatePath("/settings");
}
