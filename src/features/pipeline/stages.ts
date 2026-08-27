import { isCompletedPaidJob } from "@/lib/lifecycle";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { PipelineCard, PipelineStageName, RawContact, RawFollowUp, RawJob, RawLead, RawSale } from "./types";

export const PIPELINE_STAGES: { name: PipelineStageName; color: string }[] = [
  { name: "Lead", color: "#64748b" },
  { name: "Quoted", color: "#2563eb" },
  { name: "Active", color: "#4A3FA8" },
  { name: "Complete", color: "#b45309" },
  { name: "Paid", color: "#3f7c3f" },
];

// Board columns read the industry-profile word for a lead record ("Estimate",
// "Bid", "Opportunity"...) for the "Quoted" column specifically, so it always
// matches the same word PipelineQuickAdd's tab already uses to create one --
// they're two views of the same vocabulary and must never drift apart again.
// The other columns stay static English across profiles; no per-profile word
// exists for them yet (a bigger content pass, not done here).
export function getStageDisplayLabel(stageName: PipelineStageName, profile: IndustryProfile): string {
  if (stageName === "Quoted") return profile.labels.leadSingular;
  return stageName;
}

// Which quick-add tab a stage's "Add" affordance should open to — used by
// both the desktop per-column links and the mobile FAB so tapping "Add" from
// a given stage always lands on the tab that actually creates a record there.
export const STAGE_TO_QUICK_ADD_TYPE: Record<string, "lead" | "job" | "sale"> = {
  Lead: "lead",
  Quoted: "lead",
  Active: "job",
  Complete: "job",
  Paid: "sale",
};

function contactName(contact: RawContact): string | null {
  if (!contact) return null;
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();
  return name || null;
}

// Explicit, not fuzzy -- every value OPPORTUNITY_STATUSES (src/lib/constants.ts)
// actually offers is listed here. The old version delegated to crm/stages.ts's
// keyword-matching mapToStage(), which silently fell through to "Lead" for
// "Estimate Sent" and "Follow Up" (neither contains "quoted"/"proposal"/etc),
// so the board's own default status for its own "Quoted" column's quick-add
// never actually landed a new record there. A lead only ever renders as a
// card with stage "Active" in the rare case syncAcceptedOpportunity failed
// after a Won status was saved (see mapRecordsToCards) -- normally a Won lead
// is immediately superseded by its auto-created job.
const LEAD_STATUS_TO_STAGE: Record<string, PipelineStageName> = {
  "New": "Lead",
  "Contacted": "Lead",
  "Estimate Sent": "Quoted",
  "Follow Up": "Quoted",
  "Won": "Active",
  "Lost": "Lost",
};

function leadPipelineStage(status: string | null): PipelineStageName {
  return LEAD_STATUS_TO_STAGE[status ?? ""] ?? "Lead";
}

function jobPipelineStage(status: string | null, paidStatus: string | null): PipelineStageName {
  const s = (status || "").toLowerCase();
  if (s.includes("cancel")) return "Lost";
  if (isCompletedPaidJob(status, paidStatus)) return "Paid";
  if (s.includes("complete")) return "Complete";
  return "Active";
}

// Follow-ups have no direct link to a job (only lead_id and contact_id), so
// the badge match is: exact lead_id for a lead card, else fall back to
// contact_id (covers job/sale cards, and leads a follow-up wasn't explicitly
// linked to). Earliest due date wins if a lead/contact has more than one.
function isOpenFollowUpStatus(status: string | null): boolean {
  return (status || "").toLowerCase().trim() !== "complete";
}

function buildFollowUpIndex(followUps: RawFollowUp[]) {
  const byLead = new Map<string, RawFollowUp>();
  const byContact = new Map<string, RawFollowUp>();
  const open = followUps
    .filter((f) => isOpenFollowUpStatus(f.status))
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  for (const f of open) {
    if (f.lead_id && !byLead.has(f.lead_id)) byLead.set(f.lead_id, f);
    if (f.contact_id && !byContact.has(f.contact_id)) byContact.set(f.contact_id, f);
  }
  return { byLead, byContact };
}

function findOpenFollowUp(
  index: { byLead: Map<string, RawFollowUp>; byContact: Map<string, RawFollowUp> },
  leadId: string | null,
  contactId: string | null,
): { id: string; dueDate: string } | null {
  const match = (leadId ? index.byLead.get(leadId) : undefined) ?? (contactId ? index.byContact.get(contactId) : undefined);
  return match ? { id: match.id, dueDate: match.due_date } : null;
}

// One card per opportunity, rendered at its most-advanced record. A lead that
// already has a job is superseded by that job's card; a job that already has a
// sale is superseded by that sale's card. Known simplification: a lead with more
// than one job only surfaces via its jobs, not a v1 concern.
export function mapRecordsToCards(
  leads: RawLead[],
  jobs: RawJob[],
  sales: RawSale[],
  followUps: RawFollowUp[] = [],
): PipelineCard[] {
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const leadIdsWithJob = new Set(jobs.filter((j) => j.lead_id).map((j) => j.lead_id as string));
  const jobIdsWithSale = new Set(sales.filter((s) => s.job_id).map((s) => s.job_id as string));
  const followUpIndex = buildFollowUpIndex(followUps);

  const cards: PipelineCard[] = [];

  for (const sale of sales) {
    const job = sale.job_id ? jobById.get(sale.job_id) : undefined;
    cards.push({
      id: `sale-${sale.id}`,
      sourceType: "sale",
      sourceId: sale.id,
      stage: "Paid",
      title: sale.service_type || "Revenue record",
      value: sale.amount,
      contactId: sale.contact_id,
      contactName: contactName(sale.contact ?? null),
      statusLabel: sale.payment_status || "Paid",
      dateLabel: sale.sale_date,
      editHref: `/sales/${sale.id}/edit`,
      chain: { leadId: job?.lead_id ?? null, jobId: sale.job_id, saleId: sale.id },
      openFollowUp: findOpenFollowUp(followUpIndex, job?.lead_id ?? null, sale.contact_id),
    });
  }

  for (const job of jobs) {
    if (jobIdsWithSale.has(job.id)) continue;
    cards.push({
      id: `job-${job.id}`,
      sourceType: "job",
      sourceId: job.id,
      stage: jobPipelineStage(job.status, job.paid_status),
      title: job.service_type || "Untitled job",
      value: job.job_value,
      contactId: job.contact_id,
      contactName: contactName(job.contact ?? null),
      statusLabel: job.status || "Scheduled",
      dateLabel: job.start_date,
      editHref: `/jobs/${job.id}/edit`,
      chain: { leadId: job.lead_id, jobId: job.id, saleId: null },
      openFollowUp: findOpenFollowUp(followUpIndex, job.lead_id, job.contact_id),
    });
  }

  for (const lead of leads) {
    if (leadIdsWithJob.has(lead.id)) continue;
    cards.push({
      id: `lead-${lead.id}`,
      sourceType: "lead",
      sourceId: lead.id,
      stage: leadPipelineStage(lead.status),
      title: lead.service_requested || "Untitled opportunity",
      value: lead.estimated_value,
      contactId: lead.contact_id,
      contactName: contactName(lead.contact ?? null),
      statusLabel: lead.status || "New",
      dateLabel: lead.next_follow_up_date,
      editHref: `/leads/${lead.id}/edit`,
      chain: { leadId: lead.id, jobId: null, saleId: null },
      openFollowUp: findOpenFollowUp(followUpIndex, lead.id, lead.contact_id),
    });
  }

  return cards;
}

export function groupCardsByStage(cards: PipelineCard[]): Map<PipelineStageName, PipelineCard[]> {
  const map = new Map<PipelineStageName, PipelineCard[]>();
  for (const stage of PIPELINE_STAGES) map.set(stage.name, []);
  map.set("Lost", []);
  for (const card of cards) {
    map.get(card.stage)!.push(card);
  }
  return map;
}
