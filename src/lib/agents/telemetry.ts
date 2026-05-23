import type { SupabaseClient } from "@supabase/supabase-js";

export type TelemetrySnapshot = {
  overdueFollowUpCount: number;
  revenueThisWeek: number;
  revenueFourWeekAvg: number;
  revenueDeltaPct: number;
  staleJobCount: number;
  newCustomersNoFollowUp: number;
  unpaidInvoiceCount: number;
  unpaidInvoiceTotal: number;
  pendingDataProposals: number;
};

export async function compileTelemetry(
  orgId: string,
  supabase: SupabaseClient,
): Promise<TelemetrySnapshot> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const tenDaysAgo = new Date(now.getTime() - 10 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const thisWeekStart = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000).toISOString().slice(0, 10);

  const [
    overdueResult,
    revenueThisWeekResult,
    revenueFourWeeksResult,
    staleJobsResult,
    newCustomersResult,
    unpaidResult,
    dataProposalsResult,
  ] = await Promise.all([
    // 1. Overdue follow-ups ≥7 days
    supabase
      .from("follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("company_id", orgId)
      .neq("status", "complete")
      .lt("due_date", sevenDaysAgo),

    // 2a. Revenue this week
    supabase
      .from("sales")
      .select("amount")
      .eq("company_id", orgId)
      .gte("sale_date", thisWeekStart),

    // 2b. Revenue over prior 4 weeks (for rolling avg)
    supabase
      .from("sales")
      .select("amount")
      .eq("company_id", orgId)
      .gte("sale_date", fourWeeksAgo)
      .lt("sale_date", thisWeekStart),

    // 3. Stale jobs ≥10 days
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", orgId)
      .not("status", "in", '("completed","cancelled")')
      .lt("updated_at", tenDaysAgo),

    // 4. New customers in last 7 days with no follow-up
    supabase
      .from("customers")
      .select("id")
      .eq("company_id", orgId)
      .gte("created_at", sevenDaysAgo),

    // 5. Unpaid invoices ≥30 days
    supabase
      .from("sales")
      .select("amount")
      .eq("company_id", orgId)
      .neq("payment_status", "paid")
      .lt("sale_date", thirtyDaysAgo),

    // 6. Pending data reconciliation proposals
    supabase
      .from("data_reconciliation_proposals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "pending"),
  ]);

  // Revenue calculations (DB does the math)
  const revenueThisWeek = (revenueThisWeekResult.data || []).reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0,
  );
  const revenueFourWeeks = (revenueFourWeeksResult.data || []).reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0,
  );
  const revenueFourWeekAvg = revenueFourWeeks / 4;
  const revenueDeltaPct =
    revenueFourWeekAvg > 0
      ? Math.round(((revenueThisWeek - revenueFourWeekAvg) / revenueFourWeekAvg) * 100)
      : 0;

  // Check new customers for missing follow-ups
  const newCustomerIds = (newCustomersResult.data || []).map((c) => c.id);
  let newCustomersNoFollowUp = 0;
  if (newCustomerIds.length > 0) {
    const { data: followedUp } = await supabase
      .from("follow_ups")
      .select("customer_id")
      .eq("company_id", orgId)
      .in("customer_id", newCustomerIds);
    const followedUpIds = new Set((followedUp || []).map((f) => f.customer_id));
    newCustomersNoFollowUp = newCustomerIds.filter((id) => !followedUpIds.has(id)).length;
  }

  const unpaidSales = unpaidResult.data || [];

  return {
    overdueFollowUpCount: overdueResult.count ?? 0,
    revenueThisWeek,
    revenueFourWeekAvg,
    revenueDeltaPct,
    staleJobCount: staleJobsResult.count ?? 0,
    newCustomersNoFollowUp,
    unpaidInvoiceCount: unpaidSales.length,
    unpaidInvoiceTotal: unpaidSales.reduce((sum, s) => sum + Number(s.amount || 0), 0),
    pendingDataProposals: dataProposalsResult.count ?? 0,
  };
}
