import type { SupabaseClient } from "@supabase/supabase-js";
import { getAutomationQueue, JOB_POST_COMPLETION_OUTREACH } from "@/lib/queue/client";

export type SmartGroupRule = {
  field: string;
  operator: string;
  value?: string;
};
import { sendSms } from "@/lib/messaging/sms";
import { toE164 } from "@/lib/webhook-validation";

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
  run_count: number | null;
};

// Chained triggers (an automation's own add_tag / set_status firing further
// automations) are capped so a tag ping-pong between rules can never run away.
const MAX_TRIGGER_DEPTH = 3;

export async function triggerAutomations(
  orgId: string,
  triggerType: string,
  triggerConfig: Record<string, unknown>,
  contactId: string,
  supabase: SupabaseClient,
  depth = 0
): Promise<void> {
  if (depth > MAX_TRIGGER_DEPTH) return;
  // 1. Fetch active automations for org with matching trigger_type
  const { data: automations } = await supabase
    .from("automations")
    .select("id, organization_id, name, conditions, actions, run_count")
    .eq("organization_id", orgId)
    .eq("trigger_type", triggerType)
    .eq("is_active", true);

  if (!automations || automations.length === 0) return;

  // Fetch contact for condition evaluation
  const { data: contact } = await supabase
    .from("master_customers")
    .select("id, first_name, last_name, relationship_status, source, primary_phone, primary_email, created_at")
    .eq("id", contactId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!contact) return;

  for (const automation of automations as Automation[]) {
    // 3. Skip if this automation ran for this contact in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString();
    const { data: recentRun } = await supabase
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

    // 4. Claim the run BEFORE executing actions. The 24h throttle reads this
    // table, so writing it first makes re-entrant trigger chains (an action
    // firing tag_added/status_changed) see the run and stop — otherwise a
    // rule that adds a tag could recurse into itself before any row exists.
    const { data: runRow } = await supabase
      .from("automation_runs")
      .insert({
        organization_id: orgId,
        automation_id: automation.id,
        contact_id: contactId,
        triggered_by: triggerType,
        actions_taken: [],
        status: "success",
      })
      .select("id")
      .single();

    const actionsTaken: AutomationAction[] = [];
    let runStatus = "success";
    let runError: string | undefined;

    try {
      for (const action of automation.actions) {
        await executeAction(action, contact, orgId, supabase, triggerConfig, depth);
        actionsTaken.push(action);
      }
    } catch (err) {
      runStatus = "error";
      runError = err instanceof Error ? err.message : String(err);
    }

    // 5. Finalize the run row with what actually happened
    if (runRow) {
      await supabase
        .from("automation_runs")
        .update({ actions_taken: actionsTaken, status: runStatus, error: runError ?? null })
        .eq("id", runRow.id);
    }

    // 6. Increment run_count, update last_triggered
    await supabase
      .from("automations")
      .update({
        run_count: (automation.run_count ?? 0) + 1,
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
    const { data: tagRows } = await supabase
      .from("contact_tags")
      .select("tags(name)")
      .eq("contact_id", contact.id as string);
    const tagNames: string[] = (tagRows ?? []).flatMap(
      (r: { tags: Array<{ name: string }> }) => r.tags?.map((t) => t.name) ?? []
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
  // Unknown/unsupported operator — fail closed so an automation never fires on a
  // condition we can't actually evaluate.
  return false;
}

async function executeAction(
  action: AutomationAction,
  contact: Record<string, unknown>,
  orgId: string,
  supabase: SupabaseClient,
  _triggerConfig: Record<string, unknown>,
  depth: number
): Promise<void> {
  const contactId = contact.id as string;

  switch (action.type) {
    case "add_tag": {
      // Find or create tag
      const tagName = action.tag_name as string;
      let { data: tag } = await supabase
        .from("tags")
        .select("id")
        .eq("organization_id", orgId)
        .eq("name", tagName)
        .maybeSingle();
      if (!tag) {
        const { data: newTag } = await supabase
          .from("tags")
          .insert({ organization_id: orgId, name: tagName })
          .select("id")
          .single();
        tag = newTag;
      }
      if (tag) {
        await supabase
          .from("contact_tags")
          .upsert({ contact_id: contactId, tag_id: tag.id, applied_by: "automation" });
        // Tagging is the composition primitive — let other rules react to it.
        try {
          await triggerAutomations(orgId, "tag_added", { tag: tagName }, contactId, supabase, depth + 1);
        } catch (err) {
          console.error("[automation] chained tag_added trigger failed", err);
        }
      }
      break;
    }

    case "remove_tag": {
      const tagName = action.tag_name as string;
      const { data: tag } = await supabase
        .from("tags")
        .select("id")
        .eq("organization_id", orgId)
        .eq("name", tagName)
        .maybeSingle();
      if (tag) {
        await supabase
          .from("contact_tags")
          .delete()
          .eq("contact_id", contactId)
          .eq("tag_id", tag.id);
      }
      break;
    }

    case "set_status": {
      await supabase
        .from("master_customers")
        .update({ relationship_status: action.status as string })
        .eq("id", contactId)
        .eq("organization_id", orgId);
      try {
        await triggerAutomations(orgId, "status_changed", { status: action.status }, contactId, supabase, depth + 1);
      } catch (err) {
        console.error("[automation] chained status_changed trigger failed", err);
      }
      break;
    }

    case "create_task": {
      const title = ((action.task_title as string | undefined) ?? "").trim() || "Follow up (automation)";
      const rawDays = Number(action.due_in_days);
      const dueInDays = Number.isFinite(rawDays) && rawDays >= 0 ? Math.min(rawDays, 365) : 3;
      const dueDate = new Date(Date.now() + dueInDays * 86400000).toISOString().slice(0, 10);

      const { data: followUp, error } = await supabase
        .from("follow_ups")
        .insert({
          company_id: orgId,
          contact_id: contactId,
          message: title,
          due_date: dueDate,
          status: "Open",
        })
        .select("id")
        .single();
      if (error) throw new Error(`create_task failed: ${error.message}`);

      await supabase.from("contact_activity").insert({
        organization_id: orgId,
        contact_id: contactId,
        event_type: "task_created",
        event_label: title,
        event_detail: `Due ${dueDate} — created by automation`,
        reference_id: followUp?.id ?? null,
        reference_type: "follow_up",
        source: "agent",
      });
      break;
    }

    case "send_sms": {
      const message = (action.message as string | undefined)?.trim();
      if (!message) {
        throw new Error("send_sms action has no message configured.");
      }
      const phone = contact.primary_phone as string | null | undefined;
      if (!phone) {
        throw new Error("Contact has no phone number — SMS not sent.");
      }
      const to = toE164(phone);
      const providerMessageId = await sendSms(to, message);

      await supabase.from("communications_log").insert({
        organization_id: orgId,
        customer_id: contactId,
        direction: "outbound",
        channel: "sms",
        to_address: to,
        payload: message,
        status: "sent",
        provider_message_id: providerMessageId || null,
      });
      await supabase.from("contact_activity").insert({
        organization_id: orgId,
        contact_id: contactId,
        event_type: "message_sent",
        event_label: "SMS sent by automation",
        event_detail: message,
        source: "agent",
      });
      break;
    }

    case "create_record": {
      const boardId = action.board_id as string | undefined;
      const stageId = action.stage_id as string | undefined;
      if (!boardId || !stageId) {
        throw new Error("create_record action has no board/stage configured.");
      }
      // Stage must belong to this org and board — action config is stored data
      // but the service-role client gives no RLS backstop.
      const { data: stage } = await supabase
        .from("board_stages")
        .select("id")
        .eq("id", stageId)
        .eq("board_id", boardId)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (!stage) throw new Error("create_record stage not found for this board.");

      const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();
      const recordName =
        ((action.record_name as string | undefined) ?? "").trim() ||
        (contactName ? `${contactName} — automation` : "Created by automation");

      const { error } = await supabase.from("process_records").insert({
        organization_id: orgId,
        board_id: boardId,
        stage_id: stageId,
        contact_id: contactId,
        name: recordName,
        status: "active",
      });
      if (error) throw new Error(`create_record failed: ${error.message}`);

      await supabase.from("contact_activity").insert({
        organization_id: orgId,
        contact_id: contactId,
        event_type: "record_created",
        event_label: `Record "${recordName}" created by automation`,
        source: "agent",
      });
      break;
    }

    case "notify_owner": {
      await supabase.from("notifications").insert({
        company_id: orgId,
        type: "automation",
        title: "Automation alert",
        body: (action.message as string | undefined) || `Automation triggered for a contact.`,
        read: false,
      });
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
