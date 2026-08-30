import type { IndustryProfile } from "@/lib/industry-profiles";
import type { TelemetrySnapshot } from "@/lib/agents/telemetry";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// One shared voice, prepended to every prompt that produces text an owner
// reads. Before this, four prompts wrote to the same panel under four
// different personas ("Operations Director", "Revenue Risk Analyst", a bare
// formatter, a bare nudger) with no shared tone rule -- so the panel read
// like four different systems, and two of the four ("acknowledge the
// persistence... set severity at least one level higher", "do not soften the
// message") actively pushed toward alarm. This is the fix: one identity, one
// register, applied everywhere.
export function buildVoiceBlock(): string {
  return `--- Voice: You are Vera ---
You are Vera, this business's assistant. Everything you write is read by a
busy, non-technical small-business owner -- a plumber, a contractor, someone
running the business, not software.

- Plain language. No jargon, no software terms ("record", "signal", "query",
  "escalation", "sync"). Describe the business thing, not the data thing.
- State facts flatly. Never use "critical", "urgent", "immediately", "error",
  "invalid", "failed to", or an exclamation mark. Severity is a field in the
  schema, not a word you write in a title or body.
- Never treat a normal, healthy state as something to comment on anxiously.
  A new business with no activity yet is not "dormant" or "inactive" -- it's
  new. Silence is not a problem.
- Never declare a goal (revenue or otherwise) "out of reach," "unreachable,"
  "unachievable," or use similar finality/despair language, even when the
  banned words above don't literally appear -- that framing is exactly as
  alarming as the words this rule already forbids, just spelled differently.
  State the gap as a plain fact ("$505 toward the $10,000 goal so far this
  month") and let the owner draw their own conclusion about what it means.
- Never write about the owner's own use of Vera (how often they approve
  drafts, how engaged they are, whether they've opened the app). That is not
  something to alert a business owner about.
- Say what you're confident about plainly. If you're inferring rather than
  reading a fact, say so in a few words ("looks like", "worth a look") rather
  than stating a guess as certain.
- You never promise something on the business's behalf -- no committing to a
  price, a time, a discount, or a visit date that hasn't actually been set.
------------------------------`;
}

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

  const lines: string[] = [
    `--- Business Health Snapshot (pre-computed, do not recalculate) ---`,
    `1. Overdue follow-ups (>7 days): ${snapshot.overdueFollowUpCount}`,
    `2. Revenue this week: ${fmt.format(snapshot.revenueThisWeek)} | 4-week average: ${fmt.format(snapshot.revenueFourWeekAvg)} | Delta: ${sign}${delta.toFixed(1)}%`,
    `3. Stale jobs (no update in 10+ days): ${snapshot.staleJobCount}`,
    `4. New customers with no follow-up scheduled: ${snapshot.newCustomersNoFollowUp}`,
    `5. Unpaid invoices >30 days: ${fmt.format(snapshot.unpaidInvoiceTotal)} across ${snapshot.unpaidInvoiceCount} records`,
    `6. Pending data quality proposals: ${snapshot.pendingDataProposals}`,
  ];

  if (snapshot.monthlyRevenueGoal && snapshot.currentMonthRevenue !== undefined) {
    lines.push(
      `7. Monthly revenue goal: ${fmt.format(snapshot.monthlyRevenueGoal)} | Current month: ${fmt.format(snapshot.currentMonthRevenue)} (${snapshot.goalProgressPct ?? 0}% of goal)`,
    );
  }

  if (snapshot.pendingDraftCount !== undefined) {
    lines.push(`8. Unactioned inbox items (owner has not reviewed): ${snapshot.pendingDraftCount}`);
  }

  // draftApprovalRate30d is intentionally not surfaced here. It's a metric
  // about the owner's own use of Vera, and it used to reach the model as an
  // ordinary business signal -- which is how "0% owner approval rate" ended
  // up as an alert card on the owner's own dashboard, nagging them about not
  // using the product. It's still computed (see telemetry.ts) for internal
  // admin visibility, just no longer handed to a prompt that formats it as a
  // customer-facing alert.

  if (snapshot.topContactsByLtv && snapshot.topContactsByLtv.length > 0) {
    const contactsList = snapshot.topContactsByLtv
      .map((c) => `${c.name} (${fmt.format(c.ltv)} LTV)`)
      .join(", ");
    lines.push(`10. Top contacts by lifetime value: ${contactsList}`);
  }

  lines.push(`-------------------------------------------------------------------`);
  lines.push(`All figures above are exact database aggregates. Do not recalculate, estimate, or modify them.`);

  if (snapshot.recentAssessments && snapshot.recentAssessments.length > 0) {
    lines.push(`\n--- Prior Assessments (most recent first) ---`);
    snapshot.recentAssessments.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    lines.push(`-------------------------------------------`);
    lines.push(`Use prior assessments to identify persisting issues vs new ones.`);
  }

  return lines.join("\n");
}

export function serializeContextForChat(
  snapshot: Record<string, unknown>,
  _profile: IndustryProfile,
): string {
  return JSON.stringify(snapshot, null, 2);
}
