/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/crm/activity";

/**
 * Records a message that has already been sent (SMS via Twilio, or email via
 * Resend): inserts the outbound communication_messages row, updates the
 * thread's last-message metadata, and logs it on the contact's activity
 * timeline. Shared by the reply route (existing thread) and the
 * start-conversation route (new thread), for both channels, so none of them
 * drift on what "a sent message" actually writes.
 */
export async function recordOutboundMessage(
  supabase: SupabaseClient,
  orgId: string,
  threadId: string,
  contactId: string | null,
  messageBody: string,
  channel: "sms" | "email",
): Promise<{ id: string; communication_id: string; direction: "outbound"; body: string; status: string | null; sent_at: string }> {
  const now = new Date().toISOString();

  const { data: message, error } = await (supabase as any)
    .from("communication_messages")
    .insert({
      communication_id: threadId,
      organization_id: orgId,
      direction: "outbound",
      body: messageBody,
      status: "delivered",
      sent_at: now,
    })
    .select("id, communication_id, direction, body, status, sent_at")
    .single();

  if (error) throw new Error(error.message);

  await (supabase as any)
    .from("communications")
    .update({ last_message_at: now, last_message_preview: messageBody.slice(0, 100) })
    .eq("id", threadId);

  if (contactId) {
    try {
      await logActivity(supabase, orgId, contactId, {
        type: "message_sent",
        label: channel === "sms" ? "SMS sent" : "Email sent",
        detail: messageBody.slice(0, 100),
        referenceId: message.id,
        referenceType: "communication_message",
        source: "user",
      });
    } catch {
      // Non-fatal
    }
  }

  return message;
}
