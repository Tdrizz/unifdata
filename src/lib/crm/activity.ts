/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityEventType =
  | "record_created" | "record_updated" | "record_completed" | "record_cancelled"
  | "work_created" | "work_completed" | "work_updated"
  | "payment_received" | "invoice_created" | "invoice_overdue"
  | "task_created" | "task_completed"
  | "message_sent" | "message_received"
  | "note_added" | "tag_added" | "tag_removed"
  | "status_changed"
  | "process_stage_changed" | "process_completed" | "process_cancelled"
  | "agent_action" | "agent_draft_approved"
  | "contact_created" | "data_fixed";

export async function logActivity(
  supabase: SupabaseClient | ReturnType<typeof createAdminClient>,
  orgId: string,
  contactId: string,
  event: {
    type: ActivityEventType;
    label: string;
    detail?: string;
    referenceId?: string;
    referenceType?: string;
    source?: "user" | "agent" | "system" | "import" | "integration";
  }
): Promise<void> {
  // Use (supabase as any) since contact_activity isn't in generated types yet
  await (supabase as any).from("contact_activity").insert({
    organization_id: orgId,
    contact_id: contactId,
    event_type: event.type,
    event_label: event.label,
    event_detail: event.detail ?? null,
    reference_id: event.referenceId ?? null,
    reference_type: event.referenceType ?? null,
    source: event.source ?? "system",
  }).throwOnError();
}
