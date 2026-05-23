import type { SupabaseClient } from "@supabase/supabase-js";

export type StoredMessage = { role: "user" | "model"; text: string };

export async function getOrCreateSession(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ id: string; messages: StoredMessage[] }> {
  const { data: existing } = await supabase
    .from("chat_sessions")
    .select("id, messages")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { id: existing.id, messages: (existing.messages as StoredMessage[]) ?? [] };
  }

  const { data: created, error } = await supabase
    .from("chat_sessions")
    .insert({ organization_id: orgId, messages: [] })
    .select("id")
    .single();

  if (error || !created) throw new Error("Failed to create chat session");
  return { id: created.id, messages: [] };
}

export async function saveMessages(
  supabase: SupabaseClient,
  sessionId: string,
  messages: StoredMessage[],
  title?: string,
): Promise<void> {
  const update: Record<string, unknown> = { messages, updated_at: new Date().toISOString() };
  if (title) update.title = title;
  await supabase.from("chat_sessions").update(update).eq("id", sessionId);
}

export async function clearSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  await supabase
    .from("chat_sessions")
    .update({ messages: [], title: null, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}
