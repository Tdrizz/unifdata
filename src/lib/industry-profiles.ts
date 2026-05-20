export type BusinessSector =
  | "general"
  | "medical"
  | "construction"
  | "home_services"
  | "professional_services";

export type IndustryProfile = {
  id: BusinessSector;
  label: string;
  headline: string;
  dailyFocus: string;
  labels: {
    customerSingular: string;
    customerPlural: string;
    leadSingular: string;
    leadPlural: string;
    jobSingular: string;
    jobPlural: string;
    saleSingular: string;
    salePlural: string;
    followUpSingular: string;
    followUpPlural: string;
  };
  priorityNames: {
    pipeline: string;
    activeWork: string;
    revenue: string;
    followUps: string;
    dataHealth: string;
  };
  insightPrompts: string[];
};

export const industryProfiles: Record<BusinessSector, IndustryProfile> = {
  general: {
    id: "general",
    label: "General Business",
    headline: "Business overview",
    dailyFocus:
      "Track contacts, opportunities, work, sales, and follow-ups from one workspace.",
    labels: {
      customerSingular: "Contact",
      customerPlural: "Contacts",
      leadSingular: "Opportunity",
      leadPlural: "Opportunities",
      jobSingular: "Task",
      jobPlural: "Tasks",
      saleSingular: "Sale",
      salePlural: "Sales",
      followUpSingular: "Follow-up",
      followUpPlural: "Follow-ups",
    },
    priorityNames: {
      pipeline: "Pipeline value",
      activeWork: "Active tasks",
      revenue: "Revenue",
      followUps: "Follow-ups due",
      dataHealth: "Data quality",
    },
    insightPrompts: [
      "Which contacts or opportunities haven't had any activity this week?",
      "Which sales are unpaid or past due?",
      "Which records are missing key details before they're useful?",
    ],
  },

  medical: {
    id: "medical",
    label: "Medical / Dental / Healthcare",
    headline: "Practice operations view",
    dailyFocus:
      "Track patients, unscheduled treatment, appointments, collections, and care tasks for medical, dental, chiropractic, veterinary, and similar practices.",
    labels: {
      customerSingular: "Patient",
      customerPlural: "Patients",
      leadSingular: "Treatment case",
      leadPlural: "Treatment cases",
      jobSingular: "Appointment",
      jobPlural: "Appointments",
      saleSingular: "Collection",
      salePlural: "Collections",
      followUpSingular: "Care task",
      followUpPlural: "Care tasks",
    },
    priorityNames: {
      pipeline: "Unscheduled treatment value",
      activeWork: "Scheduled appointments",
      revenue: "Collections",
      followUps: "Care tasks due",
      dataHealth: "Chart completeness",
    },
    insightPrompts: [
      "Which patients have unscheduled treatment or are past due for recall?",
      "Which treatment cases haven't been scheduled yet?",
      "Which charts are missing contact details or case notes?",
    ],
  },

  construction: {
    id: "construction",
    label: "Construction / Contractor",
    headline: "Job and estimate view",
    dailyFocus:
      "Track customers, estimates, active jobs, invoices, and follow-ups for contractors, builders, and tradespeople.",
    labels: {
      customerSingular: "Customer",
      customerPlural: "Customers",
      leadSingular: "Estimate",
      leadPlural: "Estimates",
      jobSingular: "Job",
      jobPlural: "Jobs",
      saleSingular: "Invoice",
      salePlural: "Invoices",
      followUpSingular: "Job task",
      followUpPlural: "Job tasks",
    },
    priorityNames: {
      pipeline: "Open estimate value",
      activeWork: "Active jobs",
      revenue: "Job revenue",
      followUps: "Job tasks due",
      dataHealth: "Job data quality",
    },
    insightPrompts: [
      "Which estimates haven't had a response in over a week?",
      "Which jobs have unpaid or partial invoices outstanding?",
      "Which jobs are missing a value, start date, or customer?",
    ],
  },

  home_services: {
    id: "home_services",
    label: "Home & Field Services",
    headline: "Service and scheduling view",
    dailyFocus:
      "Track clients, quotes, service visits, invoices, and follow-up tasks for HVAC, plumbing, landscaping, cleaning, electrical, pest control, and similar trades.",
    labels: {
      customerSingular: "Client",
      customerPlural: "Clients",
      leadSingular: "Quote",
      leadPlural: "Quotes",
      jobSingular: "Service visit",
      jobPlural: "Service visits",
      saleSingular: "Invoice",
      salePlural: "Invoices",
      followUpSingular: "Follow-up task",
      followUpPlural: "Follow-up tasks",
    },
    priorityNames: {
      pipeline: "Open quote value",
      activeWork: "Scheduled visits",
      revenue: "Service revenue",
      followUps: "Follow-up tasks due",
      dataHealth: "Client data quality",
    },
    insightPrompts: [
      "Which clients are due for a callback or re-quote?",
      "Which quotes haven't had a response in the past week?",
      "Which service visits have no invoice, or invoices that are unpaid?",
    ],
  },

  professional_services: {
    id: "professional_services",
    label: "Professional Services",
    headline: "Client work and pipeline view",
    dailyFocus:
      "Track clients, proposals, active projects, invoices, and action items for consultants, agencies, accountants, lawyers, IT firms, and similar practices.",
    labels: {
      customerSingular: "Client",
      customerPlural: "Clients",
      leadSingular: "Proposal",
      leadPlural: "Proposals",
      jobSingular: "Project",
      jobPlural: "Projects",
      saleSingular: "Invoice",
      salePlural: "Invoices",
      followUpSingular: "Action item",
      followUpPlural: "Action items",
    },
    priorityNames: {
      pipeline: "Proposal pipeline",
      activeWork: "Active projects",
      revenue: "Billed revenue",
      followUps: "Action items due",
      dataHealth: "Client data quality",
    },
    insightPrompts: [
      "Which proposals haven't had a response in over five business days?",
      "Which clients are past payment terms or approaching 30 days outstanding?",
      "Which active projects are missing scope, rate, or next milestone details?",
    ],
  },
};

export const businessSectorOptions = Object.values(industryProfiles).map(
  (profile) => ({
    value: profile.id,
    label: profile.label,
  }),
);

const legacySectorAliases: Record<string, BusinessSector> = {
  dental_medical: "medical",
  field_service: "home_services",
  insurance: "professional_services",
  automotive: "general",
  retail: "general",
};

export function getIndustryProfile(
  businessSector?: string | null,
): IndustryProfile {
  if (!businessSector) {
    return industryProfiles.general;
  }

  if (businessSector in industryProfiles) {
    return industryProfiles[businessSector as BusinessSector];
  }

  const aliased = legacySectorAliases[businessSector];

  if (aliased) {
    return industryProfiles[aliased];
  }

  return industryProfiles.general;
}
