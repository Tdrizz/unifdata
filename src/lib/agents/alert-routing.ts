// Maps an agent_alerts/agent_drafts row to the page where the underlying
// issue can actually be fixed. Alert/draft clicks never land on the chat
// page (/vera) — that's only reachable from the Home dashboard's own
// embedded chat box now, not as a click-through destination. Types that
// describe a single record (via record_id) go straight to that record's
// edit page; aggregate/summary types (e.g. "5 overdue follow-ups") describe
// multiple records at once, so they route to the closest relevant list
// page instead of a single record.

type AlertForRouting = {
  alert_type: string;
  record_id?: string | null;
  title?: string | null;
};

type DraftForRouting = {
  draft_type: string;
  record_id?: string | null;
};

const REVIEW_RECORD_TYPE_ROUTES: Record<string, (id: string) => string> = {
  customer: (id) => `/customers/${id}`,
  job: (id) => `/jobs/${id}/edit`,
  sale: (id) => `/sales/${id}/edit`,
  lead: (id) => `/leads/${id}/edit`,
  follow_up: (id) => `/follow-ups/${id}/edit`,
};

// Aggregate alert types with no single record_id — routed to the list page
// where the underlying records actually live.
const AGGREGATE_ALERT_ROUTES: Record<string, string> = {
  stale_jobs: "/jobs",
  stale_job: "/jobs",
  "overdue_follow-ups": "/follow-ups",
  overdue_follow_ups: "/follow-ups",
  overdue_followups: "/follow-ups",
  stale_followups: "/follow-ups",
  new_customers_no_followup: "/follow-ups",
  new_customer_no_followup: "/follow-ups",
  churn_risk: "/customers",
};

// True insights with no fixable record or list at all (forecasts, meta
// nudges, cross-record patterns) — the pipeline overview is the closest
// thing to "go look at your business," and never the chat page.
const FALLBACK_ROUTE = "/crm";

export function getAlertHref(alert: AlertForRouting): string {
  if (alert.record_id) {
    if (alert.alert_type === "revenue") return `/sales/${alert.record_id}/edit`;
    if (alert.alert_type === "unanswered_reply") return `/customers/${alert.record_id}`;

    if (alert.alert_type === "review") {
      const recordType = alert.title?.match(/^Review requested: (customer|job|sale|lead|follow_up)$/)?.[1];
      if (recordType) return REVIEW_RECORD_TYPE_ROUTES[recordType](alert.record_id);
    }
  }

  return AGGREGATE_ALERT_ROUTES[alert.alert_type] ?? FALLBACK_ROUTE;
}

export function getDraftHref(draft: DraftForRouting): string {
  if (draft.record_id && (draft.draft_type === "outreach_email" || draft.draft_type === "outreach_sms")) {
    return `/customers/${draft.record_id}`;
  }
  return FALLBACK_ROUTE;
}
