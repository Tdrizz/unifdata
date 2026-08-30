import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactRelatedCounts, LeadRelatedCounts } from "./related-counts";

// Extension of related-counts.ts's counting: those helpers only ever WARN
// that a job/follow-up/etc. will lose its link (ON DELETE SET NULL) when a
// contact or lead is deleted -- there was no way to actually remove any of
// it. These let the delete-confirmation UI offer real, selectable
// hard-deletes per category instead. contact_notes/contact_activity aren't
// selectable here -- they're already ON DELETE CASCADE, so they're always
// gone regardless of what's checked.

export type ContactDeleteCategory = "leads" | "jobs" | "sales" | "followUps" | "communications";

const CONTACT_CATEGORY_LABELS: Record<ContactDeleteCategory, { singular: string; plural: string }> = {
  leads: { singular: "opportunity", plural: "opportunities" },
  jobs: { singular: "job", plural: "jobs" },
  sales: { singular: "sale", plural: "sales" },
  followUps: { singular: "follow-up", plural: "follow-ups" },
  communications: { singular: "message thread", plural: "message threads" },
};

export type DeleteCategoryOption = { key: string; label: string; count: number };

export function buildContactDeleteCategories(counts: ContactRelatedCounts): DeleteCategoryOption[] {
  return (Object.keys(CONTACT_CATEGORY_LABELS) as ContactDeleteCategory[])
    .filter((key) => counts[key] > 0)
    .map((key) => {
      const count = counts[key];
      const { singular, plural } = CONTACT_CATEGORY_LABELS[key];
      return { key, label: `${count} ${count === 1 ? singular : plural}`, count };
    });
}

export async function deleteContactCascade(
  supabase: SupabaseClient,
  companyId: string,
  contactId: string,
  selected: string[],
): Promise<void> {
  const set = new Set(selected);
  if (set.has("leads")) {
    await supabase.from("leads").delete().eq("company_id", companyId).eq("contact_id", contactId);
  }
  if (set.has("jobs")) {
    await supabase.from("jobs").delete().eq("company_id", companyId).eq("contact_id", contactId);
  }
  if (set.has("sales")) {
    await supabase.from("sales").delete().eq("company_id", companyId).eq("contact_id", contactId);
  }
  if (set.has("followUps")) {
    await supabase.from("follow_ups").delete().eq("company_id", companyId).eq("contact_id", contactId);
  }
  if (set.has("communications")) {
    await supabase.from("communications").delete().eq("organization_id", companyId).eq("contact_id", contactId);
  }
}

export type LeadDeleteCategory = "jobs" | "followUps";

const LEAD_CATEGORY_LABELS: Record<LeadDeleteCategory, { singular: string; plural: string }> = {
  jobs: { singular: "job", plural: "jobs" },
  followUps: { singular: "follow-up", plural: "follow-ups" },
};

export function buildLeadDeleteCategories(counts: LeadRelatedCounts): DeleteCategoryOption[] {
  return (Object.keys(LEAD_CATEGORY_LABELS) as LeadDeleteCategory[])
    .filter((key) => counts[key] > 0)
    .map((key) => {
      const count = counts[key];
      const { singular, plural } = LEAD_CATEGORY_LABELS[key];
      return { key, label: `${count} ${count === 1 ? singular : plural}`, count };
    });
}

export async function deleteLeadCascade(
  supabase: SupabaseClient,
  companyId: string,
  leadId: string,
  selected: string[],
): Promise<void> {
  const set = new Set(selected);
  if (set.has("jobs")) {
    await supabase.from("jobs").delete().eq("company_id", companyId).eq("lead_id", leadId);
  }
  if (set.has("followUps")) {
    await supabase.from("follow_ups").delete().eq("company_id", companyId).eq("lead_id", leadId);
  }
}
