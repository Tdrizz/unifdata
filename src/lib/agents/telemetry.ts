/* eslint-disable @typescript-eslint/no-explicit-any */
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
  // Extended context
  monthlyRevenueGoal?: number;
  currentMonthRevenue?: number;
  goalProgressPct?: number;
  recentAssessments?: string[];
  pendingDraftCount?: number;
  draftApprovalRate30d?: number;
  topContactsByLtv?: Array<{ id: string; name: string; ltv: number }>;
  processBoardSnapshot?: Array<{ stageName: string; stageType: string; recordCount: number; stageValue: number }>;
};

export async function compileTelemetry(
  orgId: string,
  supabase: SupabaseClient,
  preferences?: Record<string, unknown>,
): Promise<TelemetrySnapshot> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const tenDaysAgo = new Date(now.getTime() - 10 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const thisWeekStart = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000).toISOString().slice(0, 10);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [
    overdueResult,
    revenueThisWeekResult,
    revenueFourWeeksResult,
    staleJobsResult,
    newCustomersResult,
    unpaidResult,
    dataProposalsResult,
    currentMonthRevenueResult,
    recentAssessmentsResult,
    pendingDraftsResult,
    recentDraftsResult,
    topContactsResult,
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
      .not("status", "in", "(completed,cancelled)")
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
      .not("payment_status", "ilike", "paid")
      .lt("sale_date", thirtyDaysAgo),

    // 6. Pending data reconciliation proposals
    supabase
      .from("data_reconciliation_proposals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "pending"),

    // 7. Revenue this calendar month (for goal tracking)
    supabase
      .from("sales")
      .select("amount")
      .eq("company_id", orgId)
      .gte("sale_date", thisMonthStart),

    // 8. Last 3 nightly coordinator assessments
    supabase
      .from("agent_logs")
      .select("assessment")
      .eq("organization_id", orgId)
      .eq("agent_name", "nightly-coordinator")
      .not("assessment", "is", null)
      .order("created_at", { ascending: false })
      .limit(3),

    // 9. Pending (unactioned) drafts
    supabase
      .from("agent_drafts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "pending"),

    // 10. Last 30 days draft outcomes for approval rate
    supabase
      .from("agent_drafts")
      .select("status")
      .eq("organization_id", orgId)
      .gte("created_at", thirtyDaysAgo)
      .in("status", ["approved", "rejected"]),

    // 11. Top 5 customers by lifetime value (total sales)
    supabase
      .from("sales")
      .select("customer_id, amount")
      .eq("company_id", orgId)
      .not("customer_id", "is", null),
  ]);

  // Revenue calculations
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

  // Current month revenue
  const currentMonthRevenue = (currentMonthRevenueResult.data || []).reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0,
  );

  // Monthly revenue goal from preferences
  const monthlyRevenueGoal = preferences?.monthly_revenue_goal
    ? Number(preferences.monthly_revenue_goal)
    : undefined;
  const goalProgressPct =
    monthlyRevenueGoal && monthlyRevenueGoal > 0
      ? Math.round((currentMonthRevenue / monthlyRevenueGoal) * 100)
      : undefined;

  // Recent assessments
  const recentAssessments = (recentAssessmentsResult.data || [])
    .map((r) => r.assessment as string)
    .filter(Boolean);

  // Pending draft count
  const pendingDraftCount = pendingDraftsResult.count ?? 0;

  // Draft approval rate (last 30 days)
  const recentDrafts = recentDraftsResult.data || [];
  const approvedCount = recentDrafts.filter((d) => d.status === "approved").length;
  const draftApprovalRate30d =
    recentDrafts.length > 0 ? Math.round((approvedCount / recentDrafts.length) * 100) : 0;

  // Top contacts by LTV
  const ltvByCustomer = new Map<string, number>();
  for (const row of topContactsResult.data || []) {
    const cid = row.customer_id as string;
    ltvByCustomer.set(cid, (ltvByCustomer.get(cid) ?? 0) + Number(row.amount || 0));
  }
  const topCustomerIds = Array.from(ltvByCustomer.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let topContactsByLtv: Array<{ id: string; name: string; ltv: number }> = [];
  if (topCustomerIds.length > 0) {
    const { data: customerNames } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", topCustomerIds);

    topContactsByLtv = topCustomerIds.map((id) => ({
      id,
      name: (customerNames || []).find((c) => c.id === id)?.name ?? "Unknown",
      ltv: ltvByCustomer.get(id) ?? 0,
    }));
  }

  let processBoardSnapshot: TelemetrySnapshot["processBoardSnapshot"];
  try {
    const { data: defaultBoard } = await (supabase as any)
      .from("process_boards")
      .select("id")
      .eq("organization_id", orgId)
      .eq("is_default", true)
      .maybeSingle();
    if (defaultBoard) {
      const { data: stages } = await (supabase as any)
        .from("board_stages")
        .select("id, name, stage_type")
        .eq("board_id", defaultBoard.id)
        .neq("stage_type", "cancelled")
        .order("position");
      if (stages?.length) {
        const { data: records } = await (supabase as any)
          .from("process_records")
          .select("stage_id, value")
          .eq("organization_id", orgId)
          .eq("status", "active");
        processBoardSnapshot = stages.map((s: { id: string; name: string; stage_type: string }) => {
          const stageRecords = (records ?? []).filter((r: { stage_id: string }) => r.stage_id === s.id);
          return {
            stageName: s.name,
            stageType: s.stage_type,
            recordCount: stageRecords.length,
            stageValue: stageRecords.reduce((sum: number, r: { value: number | null }) => sum + (r.value ?? 0), 0),
          };
        });
      }
    }
  } catch {
    // non-critical — skip if tables don't exist yet
  }

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
    currentMonthRevenue,
    monthlyRevenueGoal,
    goalProgressPct,
    recentAssessments,
    pendingDraftCount,
    draftApprovalRate30d,
    topContactsByLtv,
    processBoardSnapshot,
  };
}
