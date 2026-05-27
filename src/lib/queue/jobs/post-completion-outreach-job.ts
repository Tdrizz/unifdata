import { createAdminClient } from "@/lib/supabase/admin";
import { isPro } from "@/lib/feature-gates";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { runOutreachWorker } from "@/lib/agents/workers/outreach-worker";
import { createNightlyTrace, flushLangfuse } from "@/lib/observability/tracing";

export type PostCompletionOutreachJobData = {
  orgId: string;
  jobId: string;
  customerId: string;
  customerName: string;
  serviceType: string;
};

export async function processPostCompletionOutreachJob(
  data: PostCompletionOutreachJobData,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, business_sector, tier, preferences")
    .eq("id", data.orgId)
    .single();

  if (!company || !isPro(company as { tier: string })) return;

  // Check if a follow-up already exists for this customer
  const { count } = await supabase
    .from("follow_ups")
    .select("id", { count: "exact", head: true })
    .eq("company_id", data.orgId)
    .eq("customer_id", data.customerId)
    .neq("status", "complete");

  if ((count ?? 0) > 0) return;

  const profile = getIndustryProfile(company.business_sector);
  const ctx = createNightlyTrace(data.orgId, new Date().toISOString().split("T")[0]);

  try {
    await runOutreachWorker(
      {
        customer_id: data.customerId,
        customer_name: data.customerName,
        days_since_contact: 0,
        open_invoice_amount: 0,
        last_service_type: data.serviceType,
        trigger: "job_completed",
      },
      company as { id: string; name: string; preferences?: Record<string, unknown> },
      supabase,
      profile,
      ctx,
    );
  } finally {
    await flushLangfuse();
  }
}
