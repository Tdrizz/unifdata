import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { verifyOwned } from "@/lib/security/ownership";
import { runSweeperBatch } from "@/lib/data-keeper/sweeper";
import { runDataQualityWorker } from "@/lib/agents/workers/data-quality-worker";
import { createChatTrace } from "@/lib/observability/tracing";

// Per-tool Zod schemas — validates before any DB write

const CreateFollowupSchema = z.object({
  customer_id: z.string().uuid(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().min(1).max(1000),
  type: z.enum(["call", "email", "visit", "other"]).optional().default("other"),
});

const UpdateJobStatusSchema = z.object({
  job_id: z.string().uuid(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled", "on_hold"]),
});

const CreateCustomerSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
});

const LogSaleSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z.number().positive(),
  service_type: z.string().min(1).max(200),
  payment_status: z.enum(["paid", "unpaid", "partial"]),
});

const FlagForReviewSchema = z.object({
  record_type: z.enum(["customer", "job", "sale", "lead", "follow_up"]),
  record_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

export async function executeTool(
  name: string,
  args: unknown,
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    switch (name) {
      case "create_followup": {
        const data = CreateFollowupSchema.parse(args);
        if (!(await verifyOwned(supabase, "master_customers", data.customer_id, orgId, "organization_id"))) {
          return { success: false, message: "That customer isn't in your workspace." };
        }
        const { error } = await supabase.from("follow_ups").insert({
          company_id: orgId,
          contact_id: data.customer_id,
          due_date: data.due_date,
          message: data.note,
          status: "open",
        });
        if (error) return { success: false, message: `Failed to create follow-up: ${error.message}` };
        return { success: true, message: `Follow-up scheduled for ${data.due_date}.` };
      }

      case "update_job_status": {
        const data = UpdateJobStatusSchema.parse(args);
        const { error } = await supabase
          .from("jobs")
          .update({ status: data.status })
          .eq("id", data.job_id)
          .eq("company_id", orgId);
        if (error) return { success: false, message: `Failed to update job: ${error.message}` };
        return { success: true, message: `Job status updated to "${data.status}".` };
      }

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

      case "log_sale": {
        const data = LogSaleSchema.parse(args);
        if (!(await verifyOwned(supabase, "master_customers", data.customer_id, orgId, "organization_id"))) {
          return { success: false, message: "That customer isn't in your workspace." };
        }
        const { error } = await supabase.from("sales").insert({
          company_id: orgId,
          contact_id: data.customer_id,
          amount: data.amount,
          service_type: data.service_type,
          payment_status: data.payment_status,
          sale_date: new Date().toISOString().slice(0, 10),
        });
        if (error) return { success: false, message: `Failed to log sale: ${error.message}` };
        return { success: true, message: `Sale of $${data.amount.toFixed(2)} logged.` };
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
