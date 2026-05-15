"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationsRead(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).in("id", ids);
}

export async function insertNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  type: string,
  title: string,
  body?: string,
) {
  await supabase.from("notifications").insert({ company_id: companyId, type, title, body: body ?? null });
}
