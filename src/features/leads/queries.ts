import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeSearchTerm } from "@/lib/search";
import { isOpenFollowUp } from "@/lib/status";
import type { LeadRow } from "./types";

type LeadsPageOpts = { q?: string; page?: number; pageSize?: number };

export async function getLeadsPageData(
  supabase: SupabaseClient,
  companyId: string,
  opts: LeadsPageOpts = {},
) {
  const { q, page = 1, pageSize = 50 } = opts;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("leads")
    .select(
      "id, customer_id, contact_id, service_requested, status, estimated_value, source, next_follow_up_date, notes, created_at",
      { count: "exact" },
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (q) {
    const term = sanitizeSearchTerm(q);
    query = query.or(
      `service_requested.ilike.%${term}%,source.ilike.%${term}%,status.ilike.%${term}%`,
    );
  }

  const { data, count } = await query.range(from, to);

  const leads = (data ?? []) as LeadRow[];
  await attachNextFollowUpDates(supabase, companyId, leads);

  return { leads, count: count ?? 0 };
}

export async function getLeadById(
  supabase: SupabaseClient,
  companyId: string,
  id: string,
): Promise<LeadRow | null> {
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, customer_id, contact_id, service_requested, status, estimated_value, source, next_follow_up_date, notes, created_at",
    )
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !data) return null;

  const lead = data as LeadRow;
  await attachNextFollowUpDates(supabase, companyId, [lead]);
  return lead;
}

type FollowUpForMerge = { lead_id: string | null; contact_id: string | null; due_date: string; status: string };
type LeadForMerge = Pick<LeadRow, "id" | "contact_id" | "next_follow_up_date">;

// leads.next_follow_up_date is a standalone column, not a live view -- only
// the lead form's own "Next follow-up" field and the CSV/Sheets importer
// ever write to it. Creating, completing, or deleting a follow-up from the
// Follow-Ups page or via Vera's create_followup tool never touches it, so a
// lead with a real, currently-open follow-up (linked either directly via
// follow_ups.lead_id, or more generally to the lead's own contact via
// follow_ups.contact_id -- how Vera's tool always links, since it has no
// lead_id parameter at all) still showed "Next follow-up: --" here.
//
// Pure and separately tested (no Supabase query involved) so the actual
// date-picking logic doesn't depend on faking .or()/.order() behavior:
// takes plain lead/follow-up rows and returns each lead's id mapped to the
// soonest of (a) an open follow-up linked directly to that lead, (b) an
// open follow-up linked to that lead's contact more generally, or (c)
// whatever's already manually stored on the lead -- folding the stored
// value in as a candidate, rather than always overwriting it, means a date
// set directly on the lead form with no corresponding follow_ups row still
// shows and still survives a save; it's only replaced when a real,
// currently-open follow-up is due sooner, which is the bug being fixed.
export function mergeNextFollowUpDates(
  leads: LeadForMerge[],
  followUps: FollowUpForMerge[],
): Map<string, string | null> {
  const earliestByLead = new Map<string, string>();
  const earliestByContact = new Map<string, string>();
  for (const fu of followUps) {
    if (!isOpenFollowUp(fu.status)) continue;
    if (fu.lead_id) {
      const current = earliestByLead.get(fu.lead_id);
      if (!current || fu.due_date < current) earliestByLead.set(fu.lead_id, fu.due_date);
    }
    if (fu.contact_id) {
      const current = earliestByContact.get(fu.contact_id);
      if (!current || fu.due_date < current) earliestByContact.set(fu.contact_id, fu.due_date);
    }
  }

  const result = new Map<string, string | null>();
  for (const lead of leads) {
    const candidates = [
      earliestByLead.get(lead.id),
      lead.contact_id ? earliestByContact.get(lead.contact_id) : undefined,
      lead.next_follow_up_date ?? undefined,
    ].filter((d): d is string => Boolean(d));
    result.set(lead.id, candidates.length > 0 ? candidates.sort()[0] : null);
  }
  return result;
}

async function attachNextFollowUpDates(
  supabase: SupabaseClient,
  companyId: string,
  leads: LeadRow[],
): Promise<void> {
  if (leads.length === 0) return;

  const leadIds = leads.map((l) => l.id);
  const contactIds = [...new Set(leads.map((l) => l.contact_id).filter((id): id is string => Boolean(id)))];

  const orParts = [`lead_id.in.(${leadIds.join(",")})`];
  if (contactIds.length > 0) orParts.push(`contact_id.in.(${contactIds.join(",")})`);

  const { data: followUps } = await supabase
    .from("follow_ups")
    .select("lead_id, contact_id, due_date, status")
    .eq("company_id", companyId)
    .or(orParts.join(","));

  const nextDates = mergeNextFollowUpDates(leads, (followUps ?? []) as FollowUpForMerge[]);
  for (const lead of leads) {
    lead.next_follow_up_date = nextDates.get(lead.id) ?? null;
  }
}
