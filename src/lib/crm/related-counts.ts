import type { SupabaseClient } from "@supabase/supabase-js";

// Deleting a contact or a lead doesn't cascade-delete most of what points at
// it -- leads/jobs/sales/follow_ups/communications.contact_id, and
// jobs/follow_ups.lead_id, are all ON DELETE SET NULL, so those rows survive
// with the link quietly dropped (no crash, but no name on the record
// anymore either). contact_notes and contact_activity, on the other hand,
// ARE ON DELETE CASCADE -- deleting a contact permanently deletes those.
// Neither behavior was ever surfaced to whoever clicked delete. These
// helpers count what's actually attached before the delete confirmation is
// shown, so "are you sure?" means something instead of being boilerplate.

export type ContactRelatedCounts = {
  leads: number;
  jobs: number;
  sales: number;
  followUps: number;
  communications: number;
  notes: number;
  activity: number;
};

export async function getContactRelatedCounts(
  supabase: SupabaseClient,
  companyId: string,
  contactId: string,
): Promise<ContactRelatedCounts> {
  const [leads, jobs, sales, followUps, communications, notes, activity] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("contact_id", contactId),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("contact_id", contactId),
    supabase.from("sales").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("contact_id", contactId),
    supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("contact_id", contactId),
    supabase.from("communications").select("id", { count: "exact", head: true }).eq("organization_id", companyId).eq("contact_id", contactId),
    supabase.from("contact_notes").select("id", { count: "exact", head: true }).eq("organization_id", companyId).eq("contact_id", contactId),
    supabase.from("contact_activity").select("id", { count: "exact", head: true }).eq("organization_id", companyId).eq("contact_id", contactId),
  ]);

  return {
    leads: leads.count ?? 0,
    jobs: jobs.count ?? 0,
    sales: sales.count ?? 0,
    followUps: followUps.count ?? 0,
    communications: communications.count ?? 0,
    notes: notes.count ?? 0,
    activity: activity.count ?? 0,
  };
}

// A short, human-readable sentence listing what's actually attached, for the
// delete confirmation panel's description. Returns null when there's
// nothing to warn about, so the caller can fall back to a plain message.
export function describeContactRelatedCounts(counts: ContactRelatedCounts): string | null {
  const unlinked: string[] = [];
  if (counts.leads) unlinked.push(plural(counts.leads, "opportunity", "opportunities"));
  if (counts.jobs) unlinked.push(plural(counts.jobs, "job"));
  if (counts.sales) unlinked.push(plural(counts.sales, "sale"));
  if (counts.followUps) unlinked.push(plural(counts.followUps, "follow-up"));
  if (counts.communications) unlinked.push(plural(counts.communications, "message thread"));

  const deleted: string[] = [];
  if (counts.notes) deleted.push(plural(counts.notes, "note"));
  if (counts.activity) deleted.push(plural(counts.activity, "activity log entry", "activity log entries"));

  if (unlinked.length === 0 && deleted.length === 0) return null;

  const parts: string[] = [];
  if (unlinked.length > 0) {
    parts.push(`${joinList(unlinked)} will lose this connection but won't be deleted.`);
  }
  if (deleted.length > 0) {
    parts.push(`${joinList(deleted)} will be permanently deleted.`);
  }
  return parts.join(" ");
}

export type LeadRelatedCounts = { jobs: number; followUps: number };

export async function getLeadRelatedCounts(
  supabase: SupabaseClient,
  companyId: string,
  leadId: string,
): Promise<LeadRelatedCounts> {
  const [jobs, followUps] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("lead_id", leadId),
    supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("lead_id", leadId),
  ]);

  return { jobs: jobs.count ?? 0, followUps: followUps.count ?? 0 };
}

export function describeLeadRelatedCounts(counts: LeadRelatedCounts): string | null {
  const unlinked: string[] = [];
  if (counts.jobs) unlinked.push(plural(counts.jobs, "job"));
  if (counts.followUps) unlinked.push(plural(counts.followUps, "follow-up"));
  if (unlinked.length === 0) return null;
  return `${joinList(unlinked)} will lose this connection but won't be deleted.`;
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function joinList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
