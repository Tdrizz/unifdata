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
    headline: "Business operating view",
    dailyFocus:
      "Track relationships, opportunities, work, revenue, actions, and data quality from one workspace.",
    labels: {
      customerSingular: "Relationship",
      customerPlural: "Relationships",
      leadSingular: "Opportunity",
      leadPlural: "Opportunities",
      jobSingular: "Work item",
      jobPlural: "Work items",
      saleSingular: "Revenue record",
      salePlural: "Revenue",
      followUpSingular: "Action",
      followUpPlural: "Actions",
    },
    priorityNames: {
      pipeline: "Open opportunity value",
      activeWork: "Active work",
      revenue: "Revenue",
      followUps: "Actions due",
      dataHealth: "Data quality",
    },
    insightPrompts: [
      "Which relationships or opportunities need attention today?",
      "What revenue is open, unpaid, or at risk?",
      "Which records need cleanup before reporting can be trusted?",
    ],
  },

  medical: {
    id: "medical",
    label: "Medical / Dental / Healthcare",
    headline: "Patient flow and collections view",
    dailyFocus:
      "Track patients, treatment opportunities, appointments, collections, and patient follow-ups for medical, dental, chiropractic, veterinary, and similar practices.",
    labels: {
      customerSingular: "Patient",
      customerPlural: "Patients",
      leadSingular: "Treatment opportunity",
      leadPlural: "Treatment opportunities",
      jobSingular: "Appointment",
      jobPlural: "Appointments",
      saleSingular: "Collection",
      salePlural: "Collections",
      followUpSingular: "Patient action",
      followUpPlural: "Patient actions",
    },
    priorityNames: {
      pipeline: "Open treatment value",
      activeWork: "Scheduled appointments",
      revenue: "Collections",
      followUps: "Patient actions due",
      dataHealth: "Patient data quality",
    },
    insightPrompts: [
      "Which patients need recall or treatment follow-up?",
      "Which treatment opportunities have not turned into appointments?",
      "Which patient records are missing usable contact details?",
    ],
  },

  construction: {
    id: "construction",
    label: "Construction / Contractor",
    headline: "Project and estimate view",
    dailyFocus:
      "Track customers, estimates, projects, payments, follow-ups, and project data quality.",
    labels: {
      customerSingular: "Customer",
      customerPlural: "Customers",
      leadSingular: "Estimate",
      leadPlural: "Estimates",
      jobSingular: "Project",
      jobPlural: "Projects",
      saleSingular: "Payment",
      salePlural: "Payments",
      followUpSingular: "Project action",
      followUpPlural: "Project actions",
    },
    priorityNames: {
      pipeline: "Open estimate value",
      activeWork: "Active projects",
      revenue: "Project revenue",
      followUps: "Project actions due",
      dataHealth: "Project data quality",
    },
    insightPrompts: [
      "Which estimates need follow-up before they go cold?",
      "Which active projects are tied to unpaid or partial payments?",
      "Which project records are missing customer, value, or schedule details?",
    ],
  },

  home_services: {
    id: "home_services",
    label: "Home & Field Services",
    headline: "Service operations view",
    dailyFocus:
      "Track clients, quotes, service visits, payments, and follow-ups for HVAC, plumbing, landscaping, cleaning, electrical, pest control, and similar trades.",
    labels: {
      customerSingular: "Client",
      customerPlural: "Clients",
      leadSingular: "Quote",
      leadPlural: "Quotes",
      jobSingular: "Service visit",
      jobPlural: "Service visits",
      saleSingular: "Payment",
      salePlural: "Payments",
      followUpSingular: "Client action",
      followUpPlural: "Client actions",
    },
    priorityNames: {
      pipeline: "Open quote value",
      activeWork: "Scheduled service",
      revenue: "Service revenue",
      followUps: "Client actions due",
      dataHealth: "Service data quality",
    },
    insightPrompts: [
      "Which clients need follow-up today?",
      "Which open quotes should be handled first?",
      "Which service visits or payments need attention?",
    ],
  },

  professional_services: {
    id: "professional_services",
    label: "Professional Services",
    headline: "Client work and proposal view",
    dailyFocus:
      "Track clients, proposals, projects, invoices, and follow-ups for consultants, agencies, accountants, lawyers, IT services, and similar firms.",
    labels: {
      customerSingular: "Client",
      customerPlural: "Clients",
      leadSingular: "Proposal",
      leadPlural: "Proposals",
      jobSingular: "Project",
      jobPlural: "Projects",
      saleSingular: "Invoice",
      salePlural: "Invoices",
      followUpSingular: "Client action",
      followUpPlural: "Client actions",
    },
    priorityNames: {
      pipeline: "Open proposal value",
      activeWork: "Active projects",
      revenue: "Revenue",
      followUps: "Client actions due",
      dataHealth: "Client data quality",
    },
    insightPrompts: [
      "Which proposals need follow-up?",
      "Which clients have unpaid or partial invoices?",
      "Which active projects need better record tracking?",
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
