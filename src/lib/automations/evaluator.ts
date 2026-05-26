import type { SupabaseClient } from "@supabase/supabase-js";
import type { SmartGroupRule } from "@/lib/crm/smart-groups";
import { getAutomationQueue, JOB_POST_COMPLETION_OUTREACH } from "@/lib/queue/client";

type AutomationAction = {
  type: string;
  [key: string]: unknown;
};

type Automation = {
  id: string;
  organization_id: string;
  name: string;
  conditions: SmartGroupRule[];
  actions: AutomationAction[];
};

export async function triggerAutomations(
  orgId: string,
  triggerType: string,
  triggerConfig: Record<string, unknown>,
  contactId: string,
  supabase: SupabaseClient
): Promise<void> {
  // 1. Fetch active automations for org with matching trigger_type
  const { data: automations } = await (supabase as any)
    .from("automations")
    .select("id, organization_id, name, conditions, actions")
    .eq("organization_id", orgId)
    .eq("trigger_type", triggerType)
    .eq("is_active", true);

  if (!automations || automations.length === 0) return;

  // Fetch contact for condition evaluation
  const { data: contact } = await (supabase as any)
    .from("master_customers")
    .select("id, relationship_status, source, primary_phone, email, created_at")
    .eq("id", contactId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!contact) return;

  for (const automation of automations as Automation[]) {
    // 3. Skip if this automation ran for this contact in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString();
    const { data: recentRun } = await (supabase as any)
      .from("automation_runs")
      .select("id")
      .eq("automation_id", automation.id)
      .eq("contact_id", contactId)
      .gte("run_at", twentyFourHoursAgo)
      .limit(1)
      .maybeSingle();

    if (recentRun) continue;

    // 2. Evaluate conditions
    const conditions: SmartGroupRule[] = Array.isArray(automation.conditions)
      ? automation.conditions
      : [];

    const conditionsMet = conditions.length === 0 || (
      await Promise.all(
        conditions.map((c) => evaluateCondition(c, contact, orgId, supabase))
      )
    ).every(Boolean);

    if (!conditionsMet) continue;

    // 4. Execute actions in sequence
    const actionsTaken: AutomationAction[] = [];
    let runStatus = "success";
    let runError: string | undefined;

    try {
      for (const action of automation.actions) {
        await executeAction(action, contact, orgId, supabase, triggerConfig);
        actionsTaken.push(action);
      }
    } catch (err) {
      runStatus = "error";
      runError = err instanceof Error ? err.message : String(err);
    }

    // 5. Write automation_runs row
    await (supabase as any).from("automation_runs").insert({
      organization_id: orgId,
      automation_id: automation.id,
      contact_id: contactId,
      triggered_by: triggerType,
      actions_taken: actionsTaken,
      status: runStatus,
      error: runError ?? null,
    });

    // 6. Increment run_count, update last_triggered
    await (supabase as any)
      .from("automations")
      .update({
        run_count: (automation as unknown as { run_count: number }).run_count
          ? (automation as unknown as { run_count: number }).run_count + 1
          : 1,
        last_triggered: new Date().toISOString(),
      })
      .eq("id", automation.id);
  }
}

async function evaluateCondition(
  rule: SmartGroupRule,
  contact: Record<string, unknown>,
  orgId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const { field, operator, value } = rule;

  if (field === "tag") {
    const { data: tagRows } = await (supabase as any)
      .from("contact_tags")
      .select("tags(name)")
      .eq("contact_id", contact.id);
    const tagNames: string[] = (tagRows ?? []).map(
      (r: { tags: { name: string } | null }) => r.tags?.name ?? ""
    );
    if (operator === "is") return tagNames.includes(value ?? "");
    if (operator === "is_not") return !tagNames.includes(value ?? "");
    return false;
  }

  const fieldValue = contact[field as keyof typeof contact] as string | null | undefined;
  if (operator === "is") return fieldValue === value;
  if (operator === "is_not") return fieldValue !== value;
  if (operator === "contains") return (fieldValue ?? "").toLowerCase().includes((value ?? "").toLowerCase());
  if (operator === "is_blank") return fieldValue == null || fieldValue === "";
  if (operator === "is_not_blank") return fieldValue != null && fieldValue !== "";
  return true;
}

async function executeAction(
  action: AutomationAction,
  contact: Record<string, unknown>,
  orgId: string,
  supabase: SupabaseClient,
  _triggerConfig: Record<string, unknown>
): Promise<void> {
  const contactId = contact.id as string;

  switch (action.type) {
    case "add_tag": {
      // Find or create tag
      const tagName = action.tag_name as string;
      let { data: tag } = await (supabase as any)
        .from("tags")
        .select("id")
        .eq("organization_id", orgId)
        .eq("name", tagName)
        .maybeSingle();
      if (!tag) {
        const { data: newTag } = await (supabase as any)
          .from("tags")
          .insert({ organization_id: orgId, name: tagName })
          .select("id")
          .single();
        tag = newTag;
      }
      if (tag) {
        await (supabase as any)
          .from("contact_tags")
          .upsert({ contact_id: contactId, tag_id: tag.id, applied_by: "automation" });
      }
      break;
    }

    case "remove_tag": {
      const tagName = action.tag_name as string;
      const { data: tag } = await (supabase as any)
        .from("tags")
        .select("id")
        .eq("organization_id", orgId)
        .eq("name", tagName)
        .maybeSingle();
      if (tag) {
        await (supabase as any)
          .from("contact_tags")
          .delete()
          .eq("contact_id", contactId)
          .eq("tag_id", tag.id);
      }
      break;
    }

    case "set_status": {
      await (supabase as any)
        .from("master_customers")
        .update({ relationship_status: action.status })
        .eq("id", contactId);
      break;
    }

    case "create_task": {
      // Log as activity for now (no tasks table defined yet)
      await (supabase as any).from("contact_activity").insert({
        organization_id: orgId,
        contact_id: contactId,
        event_type: "task_created",
        event_label: action.task_title ?? "Task created by automation",
        event_detail: action.task_description ?? null,
        source: "agent",
      });
      break;
    }

    case "send_sms": {
      // TODO: wire Twilio — log intent as activity
      await (supabase as any).from("contact_activity").insert({
        organization_id: orgId,
        contact_id: contactId,
        event_type: "message_sent",
        event_label: "SMS sent by automation",
        event_detail: action.message as string | null ?? null,
        source: "agent",
      });
      break;
    }

    case "create_record": {
      // Would need a board context — log as activity for now
      await (supabase as any).from("contact_activity").insert({
        organization_id: orgId,
        contact_id: contactId,
        event_type: "record_created",
        event_label: "Record created by automation",
        source: "agent",
      });
      break;
    }

    case "notify_owner": {
      // Log only
      console.info(`[automation] notify_owner for contact ${contactId}: ${action.message ?? ""}`);
      break;
    }

    case "request_ai_outreach": {
      const queue = getAutomationQueue();
      await queue.add(JOB_POST_COMPLETION_OUTREACH, {
        organizationId: orgId,
        contactId,
        source: "automation",
      });
      break;
    }

    default:
      console.warn(`[automation] Unknown action type: ${action.type}`);
  }
}
