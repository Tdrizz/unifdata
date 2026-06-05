import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

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
        const { error } = await supabase.from("follow_ups").insert({
          company_id: orgId,
          customer_id: data.customer_id,
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
        const { data: created, error } = await supabase.from("customers").insert({
          company_id: orgId,
          name,
          email: data.email || null,
          phone: data.phone || null,
        }).select("id").single();
        if (error) return { success: false, message: `Failed to create customer: ${error.message}` };
        void supabase.from("master_customers").insert({
          organization_id: orgId,
          legacy_customer_id: created.id,
          first_name: data.first_name,
          last_name: data.last_name,
          primary_email: data.email || null,
          primary_phone: data.phone || null,
          relationship_status: "new",
          source: "ai",
        });
        return { success: true, message: `Customer "${name}" created.` };
      }

      case "log_sale": {
        const data = LogSaleSchema.parse(args);
        const { error } = await supabase.from("sales").insert({
          company_id: orgId,
          customer_id: data.customer_id,
          amount: data.amount,
          service_type: data.service_type,
          payment_status: data.payment_status,
          sale_date: new Date().toISOString().slice(0, 10),
        });
        if (error) return { success: false, message: `Failed to log sale: ${error.message}` };
        return { success: true, message: `Sale of $${data.amount.toFixed(2)} logged.` };
      }

      case "flag_for_review": {
        const data = FlagForReviewSchema.parse(args);
        const tableMap: Record<string, string> = {
          customer: "customers",
          job: "jobs",
          sale: "sales",
          lead: "leads",
          follow_up: "follow_ups",
        };
        const table = tableMap[data.record_type];
        const { error } = await supabase
          .from(table)
          .update({ flagged_for_review: true, review_reason: data.reason })
          .eq("id", data.record_id)
          .eq("company_id", orgId);
        if (error) return { success: false, message: `Failed to flag record: ${error.message}` };
        return { success: true, message: `${data.record_type} flagged for review.` };
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
