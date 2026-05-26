import { createAdminClient } from "@/lib/supabase/admin";
import { isPro } from "@/lib/feature-gates";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { runOutreachWorker } from "@/lib/agents/workers/outreach-worker";
import { createNightlyTrace, flushLangfuse } from "@/lib/observability/tracing";

export type NewContactFollowupJobData = {
  orgId: string;
  customerId: string;
  customerName: string;
};

export async function processNewContactFollowupJob(
  data: NewContactFollowupJobData,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, business_sector, tier, preferences")
    .eq("id", data.orgId)
    .single();

  if (!company || !isPro(company as { tier: string })) return;

  // Skip if customer already has a follow-up or job history
  const [{ count: followUpCount }, { count: jobCount }] = await Promise.all([
    supabase
      .from("follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.orgId)
      .eq("customer_id", data.customerId),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.orgId)
      .eq("customer_id", data.customerId),
  ]);

  // Only draft outreach if truly a new contact with nothing scheduled
  if ((followUpCount ?? 0) > 0 || (jobCount ?? 0) > 0) return;

  const profile = getIndustryProfile(company.business_sector);
  const ctx = createNightlyTrace(data.orgId, new Date().toISOString().split("T")[0]);

  try {
    await runOutreachWorker(
      {
        customer_id: data.customerId,
        customer_name: data.customerName,
        days_since_contact: 0,
        open_invoice_amount: 0,
        last_service_type: "first contact",
        trigger: "new_customer",
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
