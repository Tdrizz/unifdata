import { mapToStage } from "@/features/crm/stages";
import { isCompletedPaidJob } from "@/lib/lifecycle";
import type { PipelineCard, PipelineStageName, RawContact, RawJob, RawLead, RawSale } from "./types";

export const PIPELINE_STAGES: { name: PipelineStageName; color: string }[] = [
  { name: "Lead", color: "#64748b" },
  { name: "Quoted", color: "#2563eb" },
  { name: "Active", color: "#4A3FA8" },
  { name: "Complete", color: "#b45309" },
  { name: "Paid", color: "#3f7c3f" },
];

function contactName(contact: RawContact): string | null {
  if (!contact) return null;
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();
  return name || null;
}

// A lead's raw status vocabulary (New/Contacted/Estimate Sent/Won/Lost...) maps
// onto the merged board's 5 stages via the same keyword logic CRMView already
// uses, just collapsed further: "Won"/"In progress" leads count as Active work
// (they're only rendered as lead cards at all if auto-conversion hasn't created
// their job yet -- see mapRecordsToCards).
function leadPipelineStage(status: string | null): PipelineStageName {
  const crmStage = mapToStage(status);
  if (crmStage === "Lost") return "Lost";
  if (crmStage === "Won" || crmStage === "In progress") return "Active";
  if (crmStage === "Quoted") return "Quoted";
  return "Lead";
}

function jobPipelineStage(status: string | null, paidStatus: string | null): PipelineStageName {
  const s = (status || "").toLowerCase();
  if (s.includes("cancel")) return "Lost";
  if (isCompletedPaidJob(status, paidStatus)) return "Paid";
  if (s.includes("complete")) return "Complete";
  return "Active";
}

// One card per opportunity, rendered at its most-advanced record. A lead that
// already has a job is superseded by that job's card; a job that already has a
// sale is superseded by that sale's card. Known simplification: a lead with more
// than one job only surfaces via its jobs, not a v1 concern.
export function mapRecordsToCards(leads: RawLead[], jobs: RawJob[], sales: RawSale[]): PipelineCard[] {
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const leadIdsWithJob = new Set(jobs.filter((j) => j.lead_id).map((j) => j.lead_id as string));
  const jobIdsWithSale = new Set(sales.filter((s) => s.job_id).map((s) => s.job_id as string));

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
