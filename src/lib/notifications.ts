"use server";

import { createClient } from "@/lib/supabase/server";

export async function markNotificationsRead(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids);
  if (error) console.error("[notifications] markNotificationsRead failed:", error.message);
}

// Soft-delete: a hard delete would erase the record that the overdue
// follow-up dedup check in api/cron/sync relies on, causing the same
// notification to be re-inserted the next day. Clearing hides it from the
// bell (see AppShell's cleared_at is null filter) without losing that.
export async function deleteNotifications(ids: string[], companyId: string) {
  if (ids.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ cleared_at: new Date().toISOString() })
    .in("id", ids)
    .eq("company_id", companyId);
  if (error) console.error("[notifications] deleteNotifications failed:", error.message);
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
