// Maps an agent_alerts/agent_drafts row to the page where the underlying
// issue can actually be fixed, instead of a generic link into the chat.
// Only alert/draft types that carry a real single-record record_id have a
// direct destination — aggregate/summary types (e.g. "5 overdue follow-ups")
// describe multiple records at once and have no single record to jump to, so
// callers should fall back to the chat deep-link (`/vera?item=...`) for those.

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

export function getAlertHref(alert: AlertForRouting): string | null {
  if (!alert.record_id) return null;

  if (alert.alert_type === "revenue") return `/sales/${alert.record_id}/edit`;
  if (alert.alert_type === "unanswered_reply") return `/customers/${alert.record_id}`;

  if (alert.alert_type === "review") {
    const recordType = alert.title?.match(/^Review requested: (customer|job|sale|lead|follow_up)$/)?.[1];
    if (recordType) return REVIEW_RECORD_TYPE_ROUTES[recordType](alert.record_id);
  }

  return null;
}

export function getDraftHref(draft: DraftForRouting): string | null {
  if (!draft.record_id) return null;
  if (draft.draft_type === "outreach_email" || draft.draft_type === "outreach_sms") {
    return `/customers/${draft.record_id}`;
  }
  return null;
}
