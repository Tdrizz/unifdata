"use server";

import { createClient } from "@/lib/supabase/server";

export async function markNotificationsRead(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids);
  if (error) console.error("[notifications] markNotificationsRead failed:", error.message);
}

export async function insertNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  type: string,
  title: string,
  body?: string,
) {
  const { error } = await supabase.from("notifications").insert({ company_id: companyId, type, title, body: body ?? null });
  if (error) console.error("[notifications] insertNotification failed:", error.message);
}
