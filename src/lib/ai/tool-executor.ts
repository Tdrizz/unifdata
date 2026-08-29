import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { verifyOwned } from "@/lib/security/ownership";
import { runSweeperBatch } from "@/lib/data-keeper/sweeper";
import { runDataQualityWorker } from "@/lib/agents/workers/data-quality-worker";
import { createChatTrace } from "@/lib/observability/tracing";
import { normalizePhone } from "@/lib/crm/phone";
import { sendSms } from "@/lib/messaging/sms";
import { sendEmail } from "@/lib/messaging/email";
import { recordOutboundMessage } from "@/lib/messaging/record-outbound-message";
import { rateLimit } from "@/lib/rate-limit";
import {
  isAcceptedOpportunityStatus,
  syncAcceptedOpportunity,
  isCompletedPaidJob,
  syncSaleForJob,
} from "@/lib/lifecycle";

// Same vocabularies the human-facing forms use — see tools.ts for why this
// matters (consistency with human-written data, and lifecycle.ts's exact
// "Won" / "complete"+"paid" checks).
const LEAD_STATUSES = ["New", "Contacted", "Estimate Sent", "Follow Up", "Won", "Lost"] as const;
const JOB_STATUSES = ["Scheduled", "Active", "In Progress", "Completed", "Cancelled"] as const;
const JOB_PAID_STATUSES = ["Unpaid", "Partial", "Paid"] as const;
const SALE_PAYMENT_STATUSES = ["Paid", "Unpaid", "Partial", "Pending"] as const;

// Per-tool Zod schemas — validates before any DB write

const CreateCustomerSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
});

const UpdateContactSchema = z.object({
  customer_id: z.string().uuid(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
});

const DeleteContactSchema = z.object({
  customer_id: z.string().uuid(),
});

const CreateLeadSchema = z.object({
  customer_id: z.string().uuid().optional(),
  service_requested: z.string().min(1).max(200),
  estimated_value: z.number().min(0).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.string().max(100).optional(),
});

const UpdateLeadStatusSchema = z.object({
  lead_id: z.string().uuid(),
  status: z.enum(LEAD_STATUSES),
});

const CreateJobSchema = z.object({
  customer_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  service_type: z.string().min(1).max(200),
  job_value: z.number().min(0).optional(),
  status: z.enum(JOB_STATUSES).optional(),
  paid_status: z.enum(JOB_PAID_STATUSES).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const UpdateJobSchema = z
  .object({
    job_id: z.string().uuid(),
    status: z.enum(JOB_STATUSES).optional(),
    paid_status: z.enum(JOB_PAID_STATUSES).optional(),
  })
  .refine((data) => data.status !== undefined || data.paid_status !== undefined, {
    message: "Provide at least one of status or paid_status",
  });

const LogSaleSchema = z.object({
  customer_id: z.string().uuid().optional(),
  amount: z.number().positive(),
  service_type: z.string().min(1).max(200),
  payment_status: z.enum(SALE_PAYMENT_STATUSES),
  source: z.string().max(100).optional(),
});

const UpdateSalePaymentStatusSchema = z.object({
  sale_id: z.string().uuid(),
  payment_status: z.enum(SALE_PAYMENT_STATUSES),
});

const CreateFollowupSchema = z.object({
  customer_id: z.string().uuid().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().min(1).max(1000),
  type: z.enum(["call", "email", "visit", "other"]).optional().default("other"),
});

const MarkFollowupCompleteSchema = z.object({
  followup_id: z.string().uuid(),
});

const FlagForReviewSchema = z.object({
  record_type: z.enum(["customer", "job", "sale", "lead", "follow_up"]),
  record_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

const SendMessageSchema = z.object({
  customer_id: z.string().uuid(),
  channel: z.enum(["sms", "email"]),
  body: z.string().min(1).max(2000),
  subject: z.string().max(200).optional(),
});

// Resolves a contact id to a display name for building tool result messages.
// The message text is the one piece of ground truth the chat route trusts
// completely (see route.ts's deterministic toolAction bubble) — a free-text
// model call has been observed live contradicting what a tool actually did
// (e.g. claiming "not linked to a customer" for a sale that in fact linked
// one), so the result message itself must state the real linkage rather than
// leaving that detail for the model to describe.
async function getContactLabel(supabase: SupabaseClient, orgId: string, contactId: string | null): Promise<string | null> {
  if (!contactId) return null;
  const { data } = await supabase
    .from("master_customers")
    .select("first_name, last_name")
    .eq("id", contactId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!data) return null;
  return [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
}

// " for Jamie Rivera" when linked, " (not linked to a contact)" when the
// caller never even supplied an id, "" for the (should-be-unreachable) case
// of an id that failed to resolve after already passing ownership checks.
function contactSuffix(label: string | null, hadId: boolean): string {
  if (label) return ` for ${label}`;
  if (!hadId) return " (not linked to a contact)";
  return "";
}

export async function executeTool(
  name: string,
  args: unknown,
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    switch (name) {
      case "create_customer": {
        const data = CreateCustomerSchema.parse(args);
        const name = `${data.first_name} ${data.last_name}`.trim();
        const { error } = await supabase.from("master_customers").insert({
          organization_id: orgId,
          first_name: data.first_name,
          last_name: data.last_name,
          primary_email: data.email || null,
          primary_phone: data.phone || null,
          relationship_status: "new",
          source: "ai",
        });
        if (error) return { success: false, message: `Failed to create customer: ${error.message}` };
        return { success: true, message: `Customer "${name}" created.` };
      }

      case "update_contact": {
        const data = UpdateContactSchema.parse(args);
        if (!(await verifyOwned(supabase, "master_customers", data.customer_id, orgId, "organization_id"))) {
          return { success: false, message: "That customer isn't in your workspace." };
        }
        const updates: Record<string, string | null> = {};
        if (data.first_name !== undefined) updates.first_name = data.first_name;
        if (data.last_name !== undefined) updates.last_name = data.last_name;
        if (data.email !== undefined) updates.primary_email = data.email || null;
        if (data.phone !== undefined) updates.primary_phone = data.phone || null;
        if (Object.keys(updates).length === 0) {
          return { success: false, message: "No fields to update were given." };
        }
        const { error } = await supabase
          .from("master_customers")
          .update(updates)
          .eq("id", data.customer_id)
          .eq("organization_id", orgId);
        if (error) return { success: false, message: `Failed to update contact: ${error.message}` };
        return { success: true, message: "Contact updated." };
      }

      case "delete_contact": {
        const data = DeleteContactSchema.parse(args);
        if (!(await verifyOwned(supabase, "master_customers", data.customer_id, orgId, "organization_id"))) {
          return { success: false, message: "That customer isn't in your workspace." };
        }
        const { error } = await supabase
          .from("master_customers")
          .delete()
          .eq("id", data.customer_id)
          .eq("organization_id", orgId);
        if (error) return { success: false, message: `Failed to delete contact: ${error.message}` };
        return { success: true, message: "Contact deleted." };
      }

      case "create_lead": {
        const data = CreateLeadSchema.parse(args);
        let contactId: string | null = null;
        if (data.customer_id) {
          if (!(await verifyOwned(supabase, "master_customers", data.customer_id, orgId, "organization_id"))) {
            return { success: false, message: "That customer isn't in your workspace." };
          }
          contactId = data.customer_id;
        }
        const status = data.status ?? "New";
        const { data: inserted, error } = await supabase
          .from("leads")
          .insert({
            company_id: orgId,
            contact_id: contactId,
            customer_id: null,
            service_requested: data.service_requested,
            estimated_value: data.estimated_value ?? null,
            status,
            source: data.source ?? null,
          })
          .select("id")
          .single();
        if (error || !inserted) {
          return { success: false, message: `Failed to create lead: ${error?.message ?? "unknown error"}` };
        }

        let note = "";
        if (isAcceptedOpportunityStatus(status)) {
          try {
            await syncAcceptedOpportunity({
              supabase,
              companyId: orgId,
              opportunityId: inserted.id as string,
              contactId,
              opportunityName: data.service_requested,
              amount: data.estimated_value ?? null,
            });
            note = " A job was created for it since it's already Won.";
          } catch {
            // non-fatal — the lead itself was created successfully
          }
        }
        const contactLabel = await getContactLabel(supabase, orgId, contactId);
        const sourceNote = data.source ? ` (source: ${data.source})` : "";
        return {
          success: true,
          message: `Lead "${data.service_requested}" created${contactSuffix(contactLabel, Boolean(data.customer_id))}${sourceNote}.${note}`,
        };
      }

      case "update_lead_status": {
        const data = UpdateLeadStatusSchema.parse(args);
        if (!(await verifyOwned(supabase, "leads", data.lead_id, orgId))) {
          return { success: false, message: "That lead isn't in your workspace." };
        }
        const { data: existing } = await supabase
          .from("leads")
          .select("service_requested, estimated_value, contact_id, customer_id")
          .eq("id", data.lead_id)
          .eq("company_id", orgId)
          .single();
        if (!existing) return { success: false, message: "Lead not found." };

        const { error } = await supabase
          .from("leads")
          .update({ status: data.status })
          .eq("id", data.lead_id)
          .eq("company_id", orgId);
        if (error) return { success: false, message: `Failed to update lead: ${error.message}` };

        let note = "";
        if (isAcceptedOpportunityStatus(data.status)) {
          try {
            await syncAcceptedOpportunity({
              supabase,
              companyId: orgId,
              opportunityId: data.lead_id,
              contactId: (existing.contact_id ?? existing.customer_id ?? null) as string | null,
              opportunityName: existing.service_requested as string,
              amount: existing.estimated_value as number | null,
            });
            note = " A job was created for it.";
          } catch {
            // non-fatal — the status update itself already succeeded
          }
        }
        return { success: true, message: `Lead status updated to "${data.status}".${note}` };
      }

      case "create_job": {
        const data = CreateJobSchema.parse(args);
        let contactId: string | null = null;
        if (data.customer_id) {
          if (!(await verifyOwned(supabase, "master_customers", data.customer_id, orgId, "organization_id"))) {
            return { success: false, message: "That customer isn't in your workspace." };
          }
          contactId = data.customer_id;
        }
        if (data.lead_id && !(await verifyOwned(supabase, "leads", data.lead_id, orgId))) {
          return { success: false, message: "That lead isn't in your workspace." };
        }
        const status = data.status ?? "Scheduled";
        const paidStatus = data.paid_status ?? "Unpaid";
        const { data: inserted, error } = await supabase
          .from("jobs")
          .insert({
            company_id: orgId,
            contact_id: contactId,
            lead_id: data.lead_id ?? null,
            service_type: data.service_type,
            status,
            job_value: data.job_value ?? null,
            start_date: data.start_date ?? null,
            completed_date: null,
            paid_status: paidStatus,
          })
          .select("id")
          .single();
        if (error || !inserted) {
          return { success: false, message: `Failed to create job: ${error?.message ?? "unknown error"}` };
        }

        let note = "";
        if (isCompletedPaidJob(status, paidStatus)) {
          try {
            const saleId = await syncSaleForJob({
              supabase,
              companyId: orgId,
              jobId: inserted.id as string,
              contactId,
              serviceType: data.service_type,
              amount: data.job_value ?? null,
              source: null,
            });
            if (saleId) note = " A sale record was created for it.";
          } catch {
            // non-fatal — the job itself was created successfully
          }
        }
        const contactLabel = await getContactLabel(supabase, orgId, contactId);
        return {
          success: true,
          message: `Job "${data.service_type}" created${contactSuffix(contactLabel, Boolean(data.customer_id))}.${note}`,
        };
      }

      case "update_job": {
        const data = UpdateJobSchema.parse(args);
        if (!(await verifyOwned(supabase, "jobs", data.job_id, orgId))) {
          return { success: false, message: "That job isn't in your workspace." };
        }
        const { data: existing } = await supabase
          .from("jobs")
          .select("status, paid_status, contact_id, service_type, job_value")
          .eq("id", data.job_id)
          .eq("company_id", orgId)
          .single();
        if (!existing) return { success: false, message: "Job not found." };

        const newStatus = data.status ?? (existing.status as string);
        const newPaidStatus = data.paid_status ?? (existing.paid_status as string);

        const { error } = await supabase
          .from("jobs")
          .update({ status: newStatus, paid_status: newPaidStatus })
          .eq("id", data.job_id)
          .eq("company_id", orgId);
        if (error) return { success: false, message: `Failed to update job: ${error.message}` };

        let note = "";
        if (isCompletedPaidJob(newStatus, newPaidStatus)) {
          try {
            const saleId = await syncSaleForJob({
              supabase,
              companyId: orgId,
              jobId: data.job_id,
              contactId: existing.contact_id as string | null,
              serviceType: existing.service_type as string,
              amount: existing.job_value as number | null,
              source: null,
            });
            if (saleId) note = " A sale record was created for it.";
          } catch {
            // non-fatal — the job update itself already succeeded
          }
        }
        return { success: true, message: `Job updated.${note}` };
      }

      case "log_sale": {
        const data = LogSaleSchema.parse(args);
        if (data.customer_id && !(await verifyOwned(supabase, "master_customers", data.customer_id, orgId, "organization_id"))) {
          return { success: false, message: "That customer isn't in your workspace." };
        }
        const { error } = await supabase.from("sales").insert({
          company_id: orgId,
          contact_id: data.customer_id ?? null,
          amount: data.amount,
          service_type: data.service_type,
          payment_status: data.payment_status,
          sale_date: new Date().toISOString().slice(0, 10),
          source: data.source ?? null,
        });
        if (error) return { success: false, message: `Failed to log sale: ${error.message}` };
        const contactLabel = await getContactLabel(supabase, orgId, data.customer_id ?? null);
        const sourceNote = data.source ? ` (source: ${data.source})` : "";
        return {
          success: true,
          message: `Sale of $${data.amount.toFixed(2)} logged${contactSuffix(contactLabel, Boolean(data.customer_id))}${sourceNote}.`,
        };
      }

      case "update_sale_payment_status": {
        const data = UpdateSalePaymentStatusSchema.parse(args);
        if (!(await verifyOwned(supabase, "sales", data.sale_id, orgId))) {
          return { success: false, message: "That sale isn't in your workspace." };
        }
        const { error } = await supabase
          .from("sales")
          .update({ payment_status: data.payment_status })
          .eq("id", data.sale_id)
          .eq("company_id", orgId);
        if (error) return { success: false, message: `Failed to update sale: ${error.message}` };
        return { success: true, message: `Sale marked "${data.payment_status}".` };
      }

      case "create_followup": {
        const data = CreateFollowupSchema.parse(args);
        if (data.customer_id && !(await verifyOwned(supabase, "master_customers", data.customer_id, orgId, "organization_id"))) {
          return { success: false, message: "That customer isn't in your workspace." };
        }
        const { error } = await supabase.from("follow_ups").insert({
          company_id: orgId,
          contact_id: data.customer_id ?? null,
          due_date: data.due_date,
          message: data.note,
          status: "open",
        });
        if (error) return { success: false, message: `Failed to create follow-up: ${error.message}` };
        const contactLabel = await getContactLabel(supabase, orgId, data.customer_id ?? null);
        return {
          success: true,
          message: `Follow-up created${contactSuffix(contactLabel, Boolean(data.customer_id))}, due ${data.due_date}.`,
        };
      }

      case "mark_followup_complete": {
        const data = MarkFollowupCompleteSchema.parse(args);
        if (!(await verifyOwned(supabase, "follow_ups", data.followup_id, orgId))) {
          return { success: false, message: "That follow-up isn't in your workspace." };
        }
        const { error } = await supabase
          .from("follow_ups")
          .update({ status: "Complete", completed_at: new Date().toISOString() })
          .eq("id", data.followup_id)
          .eq("company_id", orgId);
        if (error) return { success: false, message: `Failed to update follow-up: ${error.message}` };
        return { success: true, message: "Follow-up marked complete." };
      }

      case "send_message": {
        const data = SendMessageSchema.parse(args);
        if (!(await verifyOwned(supabase, "master_customers", data.customer_id, orgId, "organization_id"))) {
          return { success: false, message: "That customer isn't in your workspace." };
        }

        // Same per-actor send cap the Communications reply/start routes
        // enforce (10/min) -- keyed on the org since a tool call has no
        // user id in hand, but the intent is identical: a runaway chat
        // loop shouldn't be able to blast a contact with real messages.
        if (!(await rateLimit(`send_message:org:${orgId}`, 10, 60_000))) {
          return { success: false, message: "Too many messages sent in the last minute — try again shortly." };
        }

        const { data: contact } = await supabase
          .from("master_customers")
          .select("id, first_name, last_name, primary_phone, primary_email")
          .eq("id", data.customer_id)
          .eq("organization_id", orgId)
          .maybeSingle();
        if (!contact) return { success: false, message: "Contact not found." };

        const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "the contact";
        if (data.channel === "sms" && !contact.primary_phone) {
          return { success: false, message: `${contactName} doesn't have a phone number on file, so I can't text them.` };
        }
        if (data.channel === "email" && !contact.primary_email) {
          return { success: false, message: `${contactName} doesn't have an email address on file, so I can't email them.` };
        }

        const { data: company } = await supabase
          .from("companies")
          .select("name, email_slug")
          .eq("id", orgId)
          .single();
        const companyName = (company?.name as string | undefined) ?? "";

        // Same find-or-create-thread pattern as api/communications/start --
        // one thread per (org, contact, channel), reopened if it was
        // archived, so an AI-sent message lands in the exact same place a
        // manually-sent one would.
        const { data: existingThread } = await supabase
          .from("communications")
          .select("id, contact_phone, archived_at")
          .eq("organization_id", orgId)
          .eq("contact_id", contact.id)
          .eq("channel", data.channel)
          .maybeSingle();

        let thread = existingThread as { id: string; contact_phone: string | null; archived_at?: string | null } | null;
        if (thread?.archived_at) {
          await supabase.from("communications").update({ archived_at: null }).eq("id", thread.id);
        }

        const normalizedPhone = contact.primary_phone ? normalizePhone(contact.primary_phone as string) : null;

        if (!thread) {
          const { data: newThread, error: threadError } = await supabase
            .from("communications")
            .insert({
              organization_id: orgId,
              contact_id: contact.id,
              contact_phone: data.channel === "sms" ? normalizedPhone : null,
              channel: data.channel,
              status: "open",
            })
            .select("id, contact_phone")
            .single();
          if (threadError || !newThread) {
            return { success: false, message: `Could not start the conversation: ${threadError?.message ?? "unknown error"}` };
          }
          thread = newThread;
        }

        try {
          if (data.channel === "sms") {
            await sendSms(thread.contact_phone ?? normalizedPhone ?? "", data.body, companyName);
          } else {
            await sendEmail({
              to: contact.primary_email as string,
              subject: data.subject?.trim() || `Message from ${companyName}`,
              text: data.body,
              companyName,
              fromLocalPart: (company?.email_slug as string | null) ?? null,
            });
          }
        } catch (err) {
          const reason = err instanceof Error ? err.message : "send failed";
          return { success: false, message: `Could not send the ${data.channel === "sms" ? "text" : "email"}: ${reason}` };
        }

        try {
          await recordOutboundMessage(supabase, orgId, thread.id, contact.id, data.body, data.channel);
        } catch (err) {
          const reason = err instanceof Error ? err.message : "unknown error";
          // The message was actually sent at this point -- say so plainly
          // rather than reporting a clean failure for something that did
          // go out, just didn't get logged.
          return { success: false, message: `Sent to ${contactName}, but couldn't save it to Communications: ${reason}` };
        }

        return {
          success: true,
          message: `${data.channel === "sms" ? "Text" : "Email"} sent to ${contactName} and logged in Communications.`,
        };
      }

      case "scan_workspace": {
        const sweepResult = await runSweeperBatch(orgId);

        const { data: companyRow } = await supabase
          .from("companies")
          .select("id, preferences")
          .eq("id", orgId)
          .single();
        const company = {
          id: orgId,
          preferences: (companyRow?.preferences as Record<string, unknown> | null) ?? {},
        };

        const { data: pendingBefore } = await supabase
          .from("data_reconciliation_proposals")
          .select("id")
          .eq("organization_id", orgId)
          .eq("status", "pending");
        const pendingIds = (pendingBefore ?? []).map((r) => r.id as string);

        const ctx = createChatTrace(orgId, `scan-${Date.now()}`);
        await runDataQualityWorker(company, supabase, ctx);

        let autoApplied = 0;
        let stillPending = pendingIds.length;
        if (pendingIds.length > 0) {
          const { data: after } = await supabase
            .from("data_reconciliation_proposals")
            .select("id, status")
            .in("id", pendingIds);
          autoApplied = (after ?? []).filter((r) => r.status === "auto_applied").length;
          stillPending = (after ?? []).filter((r) => r.status === "pending").length;
        }

        const parts: string[] = [];
        parts.push(
          sweepResult.proposed > 0
            ? `Checked ${sweepResult.processed} records and found ${sweepResult.proposed} potential duplicate${sweepResult.proposed === 1 ? "" : "s"}.`
            : `Checked ${sweepResult.processed} records — no new duplicates found.`,
        );
        if (autoApplied > 0) {
          parts.push(`Automatically fixed ${autoApplied} of them.`);
        }
        parts.push(
          stillPending > 0
            ? `${stillPending} still need${stillPending === 1 ? "s" : ""} your review in Data Hub.`
            : `Nothing left needing review.`,
        );

        return { success: true, message: parts.join(" ") };
      }

      case "flag_for_review": {
        const data = FlagForReviewSchema.parse(args);
        const owned =
          data.record_type === "customer"
            ? await verifyOwned(supabase, "master_customers", data.record_id, orgId, "organization_id")
            : await verifyOwned(
                supabase,
                { job: "jobs", sale: "sales", lead: "leads", follow_up: "follow_ups" }[data.record_type],
                data.record_id,
                orgId,
                "company_id",
              );
        if (!owned) {
          return { success: false, message: "That record isn't in your workspace." };
        }
        const { error } = await supabase.from("agent_alerts").insert({
          organization_id: orgId,
          alert_type: "review",
          severity: "info",
          title: `Review requested: ${data.record_type}`,
          body: data.reason,
          status: "unread",
          reasoning: data.reason,
          escalation_level: 0,
          record_id: data.record_id,
        });
        if (error) return { success: false, message: `Failed to flag record: ${error.message}` };
        return { success: true, message: "Flagged for review." };
      }

      default:
        return { success: false, message: `Unknown tool: ${name}` };
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, message: "Invalid parameters" };
    }
    return { success: false, message: "Tool execution failed." };
  }
}
