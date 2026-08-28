import type { PipelineCard } from "./types";

// Data Hub (src/features/data-hub/components/DataHubView.tsx) scans the raw
// leads/jobs/follow_ups tables directly, but /crm only ever renders cards
// (one per opportunity, already merged across lead → job → sale). So its
// "View →" links pass an `issue` id instead of raw filter criteria, and these
// predicates re-express the *same* checks against card fields -- kept in sync
// by hand since the two features read from genuinely different shapes.
export type PipelineIssueId =
  | "lead-no-customer"
  | "lead-no-value"
  | "lead-no-followup"
  | "lead-no-source"
  | "orphan-jobs"
  | "job-no-value"
  | "overdue-followups"
  | "followup-no-date";

function isOverdueDate(date: string | null | undefined): boolean {
  if (!date) return false;
  return new Date(date) < new Date(new Date().toDateString());
}

export const PIPELINE_ISSUE_FILTERS: Record<PipelineIssueId, (card: PipelineCard) => boolean> = {
  "lead-no-customer": (c) => c.sourceType === "lead" && !c.contactId,
  "lead-no-value": (c) => c.sourceType === "lead" && (c.value === null || c.value === undefined),
  // A lead card's dateLabel *is* its next_follow_up_date (see mapRecordsToCards).
  "lead-no-followup": (c) => c.sourceType === "lead" && !c.dateLabel,
  "lead-no-source": (c) => c.sourceType === "lead" && !c.source,
  "orphan-jobs": (c) => c.sourceType === "job" && !c.contactId,
  "job-no-value": (c) => c.sourceType === "job" && (c.value === null || c.value === undefined),
  // Follow-ups aren't their own cards on the board -- they surface as a badge
  // on whichever opportunity card they're attached to -- so these two match
  // any card carrying the flagged follow-up rather than a follow-up row itself.
  "overdue-followups": (c) => !!c.openFollowUp && isOverdueDate(c.openFollowUp.dueDate),
  "followup-no-date": (c) => !!c.openFollowUp && !c.openFollowUp.dueDate,
};

export const PIPELINE_ISSUE_LABELS: Record<PipelineIssueId, string> = {
  "lead-no-customer": "not linked to a contact",
  "lead-no-value": "missing an estimated value",
  "lead-no-followup": "with no follow-up date",
  "lead-no-source": "missing a source",
  "orphan-jobs": "not linked to a contact",
  "job-no-value": "missing a job value",
  "overdue-followups": "with an overdue follow-up",
  "followup-no-date": "with a follow-up that has no due date",
};

export function isPipelineIssueId(value: string | null | undefined): value is PipelineIssueId {
  return !!value && Object.prototype.hasOwnProperty.call(PIPELINE_ISSUE_FILTERS, value);
}
