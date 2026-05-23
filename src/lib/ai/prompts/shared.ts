import type { IndustryProfile } from "@/lib/industry-profiles";
import type { TelemetrySnapshot } from "@/lib/agents/telemetry";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function buildVocabularyBlock(profile: IndustryProfile): string {
  return `--- Workspace Vocabulary ---
Use this terminology throughout all output. Never substitute generic alternatives.
- Customers are called: ${profile.labels.customerPlural}
- Jobs are called: ${profile.labels.jobPlural}
- Leads are called: ${profile.labels.leadPlural}
- Follow-ups are called: ${profile.labels.followUpPlural}
- Business type: ${profile.label}
----------------------------`;
}

export function buildTelemetryBlock(snapshot: TelemetrySnapshot): string {
  const delta = snapshot.revenueDeltaPct;
  const sign = delta > 0 ? "+" : "";
  return `--- Business Health Snapshot (pre-computed, do not recalculate) ---
1. Overdue follow-ups (>7 days): ${snapshot.overdueFollowUpCount}
2. Revenue this week: ${fmt.format(snapshot.revenueThisWeek)} | 4-week average: ${fmt.format(snapshot.revenueFourWeekAvg)} | Delta: ${sign}${delta.toFixed(1)}%
3. Stale jobs (no update in 10+ days): ${snapshot.staleJobCount}
4. New customers with no follow-up scheduled: ${snapshot.newCustomersNoFollowUp}
5. Unpaid invoices >30 days: ${fmt.format(snapshot.unpaidInvoiceTotal)} across ${snapshot.unpaidInvoiceCount} records
6. Pending data quality proposals: ${snapshot.pendingDataProposals}
-------------------------------------------------------------------

All figures above are exact database aggregates. Do not recalculate, estimate, or modify them.`;
}

export function serializeContextForChat(
  snapshot: Record<string, unknown>,
  _profile: IndustryProfile,
): string {
  return JSON.stringify(snapshot, null, 2);
}
