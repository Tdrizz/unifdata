/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { isCompleteWork, isCancelledWork, isOpenFollowUp, isUnpaid } from "@/lib/status";

// Every figure here is fed to the LLM as fact, so a query that silently fails
// is worse than one that throws: `count ?? 0` turns "the database was
// unreachable" into "this business has no problems", and Vera then reports a
// clean bill of health it never actually checked. Fail the whole snapshot
// instead -- the coordinator treats that as "no review happened tonight",
// which is the truth.
function unwrap<T>(label: string, result: { data?: T; error?: unknown; count?: number | null }) {
  if (result.error) {
    const message =
      typeof result.error === "object" && result.error !== null && "message" in result.error
        ? String((result.error as { message: unknown }).message)
        : String(result.error);
    throw new Error(`telemetry query "${label}" failed: ${message}`);
  }
  return result;
}

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
  const fourWeeksAgo = new Date(now.getTime() - 35 * 86400000).toISOString().slice(0, 10);
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
    // 1. Overdue follow-ups ≥7 days. The status column is fetched and filtered
    // in JS with the shared predicate rather than filtered in SQL -- see the
    // note in src/lib/status.ts. The date bound keeps this set small.
    supabase
      .from("follow_ups")
      .select("status")
      .eq("company_id", orgId)
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

    // 3. Stale jobs ≥10 days -- still open, and untouched for 10 days.
    supabase
      .from("jobs")
      .select("status")
      .eq("company_id", orgId)
      .lt("updated_at", tenDaysAgo),

    // 4. New contacts in last 7 days with no follow-up (fetch id + legacy_customer_id for cross-table lookup)
    (supabase as any)
      .from("master_customers")
      .select("id, legacy_customer_id")
      .eq("organization_id", orgId)
      .gte("created_at", sevenDaysAgo),

    // 5. Unpaid invoices ≥30 days. Filtering on "not literally paid" also
    // swept in refunded, voided, draft and blank rows and reported them to the
    // owner as money owed; isUnpaid() matches only genuinely outstanding ones.
    supabase
      .from("sales")
      .select("amount, payment_status")
      .eq("company_id", orgId)
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
      // agent_logs timestamps its rows with run_at; ordering by a column that
      // doesn't exist made this error out silently and always return nothing,
      // so night-over-night continuity never actually worked.
      .order("run_at", { ascending: false })
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

    // 11. Top 5 contacts by lifetime value (total sales via contact_id)
    (supabase as any)
      .from("sales")
      .select("contact_id, amount")
      .eq("company_id", orgId)
      .not("contact_id", "is", null),
  ]);

  unwrap("overdue follow-ups", overdueResult);
  unwrap("revenue this week", revenueThisWeekResult);
  unwrap("revenue four weeks", revenueFourWeeksResult);
  unwrap("stale jobs", staleJobsResult);
  unwrap("new customers", newCustomersResult);
  unwrap("unpaid invoices", unpaidResult);
  unwrap("data proposals", dataProposalsResult);
  unwrap("current month revenue", currentMonthRevenueResult);
  unwrap("recent assessments", recentAssessmentsResult);
  unwrap("pending drafts", pendingDraftsResult);
  unwrap("recent drafts", recentDraftsResult);
  unwrap("top contacts", topContactsResult);

  // Status filtering happens here, in JS, against the same predicates the
  // dashboard uses -- so Vera and the KPI cards can never report different
  // numbers for the same question.
  const overdueFollowUpCount = ((overdueResult.data || []) as Array<{ status: string | null }>)
    .filter((f) => isOpenFollowUp(f.status)).length;

  const staleJobCount = ((staleJobsResult.data || []) as Array<{ status: string | null }>)
    .filter((j) => !isCompleteWork(j.status) && !isCancelledWork(j.status)).length;

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

  // Check new contacts for missing follow-ups (check both contact_id and legacy customer_id)
  const newContacts = (newCustomersResult.data || []) as Array<{ id: string; legacy_customer_id: string | null }>;
  let newCustomersNoFollowUp = 0;
  if (newContacts.length > 0) {
    const masterIds = newContacts.map((c) => c.id);
    const legacyIds = newContacts.map((c) => c.legacy_customer_id).filter(Boolean) as string[];

    const [byContactId, byCustomerId] = await Promise.all([
      (supabase as any)
        .from("follow_ups")
        .select("contact_id")
        .eq("company_id", orgId)
        .in("contact_id", masterIds),
      legacyIds.length
        ? (supabase as any)
            .from("follow_ups")
            .select("customer_id")
            .eq("company_id", orgId)
            .in("customer_id", legacyIds)
        : Promise.resolve({ data: [] }),
    ]);

    const followedUpMasterIds = new Set((byContactId.data || []).map((f: { contact_id: string }) => f.contact_id));
    const followedUpLegacyIds = new Set((byCustomerId.data || []).map((f: { customer_id: string }) => f.customer_id));

    newCustomersNoFollowUp = newContacts.filter((c) => {
      if (followedUpMasterIds.has(c.id)) return false;
      if (c.legacy_customer_id && followedUpLegacyIds.has(c.legacy_customer_id)) return false;
      return true;
    }).length;
  }

  const unpaidSales = ((unpaidResult.data || []) as Array<{ amount: number | null; payment_status: string | null }>)
    .filter((s) => isUnpaid(s.payment_status));

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
  const ltvByContact = new Map<string, number>();
  for (const row of topContactsResult.data || []) {
    const cid = (row as { contact_id: string }).contact_id;
    ltvByContact.set(cid, (ltvByContact.get(cid) ?? 0) + Number(row.amount || 0));
  }
  const topContactIds = Array.from(ltvByContact.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let topContactsByLtv: Array<{ id: string; name: string; ltv: number }> = [];
  if (topContactIds.length > 0) {
    const { data: contactNames } = await (supabase as any)
      .from("master_customers")
      .select("id, first_name, last_name")
      .in("id", topContactIds);

    topContactsByLtv = topContactIds.map((id) => {
      const c = (contactNames || []).find((r: { id: string; first_name: string; last_name: string | null }) => r.id === id);
      return {
        id,
        name: c ? [c.first_name, c.last_name].filter(Boolean).join(" ") : "Unknown",
        ltv: ltvByContact.get(id) ?? 0,
      };
    });
  }

  return {
    overdueFollowUpCount,
    revenueThisWeek,
    revenueFourWeekAvg,
    revenueDeltaPct,
    staleJobCount,
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
  };
}
