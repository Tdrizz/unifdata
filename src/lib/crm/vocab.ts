import type { IndustryProfile } from "@/lib/industry-profiles";

type VocabKey =
  | "customer" | "customers"
  | "job" | "jobs"
  | "lead" | "leads"
  | "sale" | "sales"
  | "followUp" | "followUps"
  | "record" | "records"
  | "pipeline"
  | "completed" | "cancelled"
  | "value" | "invoice" | "targetDate"
  | "activeStatus" | "inactiveStatus" | "closedStatus";

function resolveRaw(profile: IndustryProfile, key: VocabKey): string {
  switch (key) {
    case "customer":      return profile.labels.customerSingular;
    case "customers":     return profile.labels.customerPlural;
    case "job":           return profile.labels.jobSingular;
    case "jobs":          return profile.labels.jobPlural;
    case "lead":          return profile.labels.leadSingular;
    case "leads":         return profile.labels.leadPlural;
    case "sale":          return profile.labels.saleSingular;
    case "sales":         return profile.labels.salePlural;
    case "followUp":      return profile.labels.followUpSingular;
    case "followUps":     return profile.labels.followUpPlural;
    case "record":        return profile.recordLabel;
    case "records":       return profile.recordPlural;
    case "pipeline":      return profile.pipelineLabel;
    case "completed":     return profile.completedLabel;
    case "cancelled":     return profile.cancelledLabel;
    case "value":         return profile.valueLabel;
    case "invoice":       return profile.invoiceLabel;
    case "targetDate":    return profile.targetDateLabel;
    case "activeStatus":  return profile.activeStatusLabel;
    case "inactiveStatus":return profile.inactiveStatusLabel;
    case "closedStatus":  return profile.closedStatusLabel;
  }
}

const singularToPlural: Partial<Record<VocabKey, VocabKey>> = {
  customer: "customers",
  job: "jobs",
  lead: "leads",
  sale: "sales",
  followUp: "followUps",
  record: "records",
};

const pluralToSingular: Partial<Record<VocabKey, VocabKey>> = {
  customers: "customer",
  jobs: "job",
  leads: "lead",
  sales: "sale",
  followUps: "followUp",
  records: "record",
};

export function label(
  profile: IndustryProfile,
  key: VocabKey,
  opts?: { capitalize?: boolean; plural?: boolean },
): string {
  let resolvedKey = key;

  if (opts?.plural === true && key in singularToPlural) {
    resolvedKey = singularToPlural[key as keyof typeof singularToPlural]!;
  } else if (opts?.plural === false && key in pluralToSingular) {
    resolvedKey = pluralToSingular[key as keyof typeof pluralToSingular]!;
  }

  const value = resolveRaw(profile, resolvedKey);

  if (opts?.capitalize) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  return value;
}
