export type BusinessSector =
  | "general"
  | "construction"
  | "field_service"
  | "dental_medical"
  | "professional_services"
  | "retail";

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
    label: "General Local Business",
    headline: "Daily operating brief",
    dailyFocus:
      "Track customers, opportunities, active work, revenue, and follow-ups from one place.",
    labels: {
      customerSingular: "Customer",
      customerPlural: "Customers",
      leadSingular: "Lead",
      leadPlural: "Leads",
      jobSingular: "Job",
      jobPlural: "Jobs",
      saleSingular: "Sale",
      salePlural: "Sales",
      followUpPlural: "Follow-ups",
    },
    priorityNames: {
      pipeline: "Open pipeline",
      activeWork: "Active work",
      revenue: "Revenue",
      followUps: "Follow-ups due",
      dataHealth: "Data health",
    },
    insightPrompts: [
      "Which customers or leads need attention today?",
      "What revenue is unpaid or at risk?",
      "Which records are missing useful business data?",
    ],
  },

  construction: {
    id: "construction",
    label: "Construction / Contractor",
    headline: "Project and estimate control center",
    dailyFocus:
      "Monitor open estimates, active jobs, unpaid work, follow-ups, and project records before revenue slips.",
    labels: {
      customerSingular: "Customer",
      customerPlural: "Customers",
      leadSingular: "Estimate",
      leadPlural: "Estimates",
      jobSingular: "Project",
      jobPlural: "Projects",
      saleSingular: "Payment",
      salePlural: "Payments",
      followUpPlural: "Estimate follow-ups",
    },
    priorityNames: {
      pipeline: "Open estimate value",
      activeWork: "Active projects",
      revenue: "Collected revenue",
      followUps: "Estimate follow-ups due",
      dataHealth: "Project data health",
    },
    insightPrompts: [
      "Which estimates need follow-up before they go cold?",
      "Which active projects are tied to unpaid or partial payments?",
      "Which customer/project records are missing contact or value data?",
    ],
  },

  field_service: {
    id: "field_service",
    label: "Field Service / Trades",
    headline: "Schedule, quotes, and service revenue",
    dailyFocus:
      "Stay on top of service calls, quotes, repeat customers, unpaid jobs, and follow-ups.",
    labels: {
      customerSingular: "Client",
      customerPlural: "Clients",
      leadSingular: "Quote",
      leadPlural: "Quotes",
      jobSingular: "Service job",
      jobPlural: "Service jobs",
      saleSingular: "Payment",
      salePlural: "Payments",
      followUpPlural: "Client follow-ups",
    },
    priorityNames: {
      pipeline: "Open quote value",
      activeWork: "Scheduled service jobs",
      revenue: "Service revenue",
      followUps: "Client follow-ups due",
      dataHealth: "Service data health",
    },
    insightPrompts: [
      "Which clients need follow-up today?",
      "Which open quotes should be chased first?",
      "Which service jobs are unpaid or missing value?",
    ],
  },

  dental_medical: {
    id: "dental_medical",
    label: "Dental / Medical Office",
    headline: "Patient flow and collections brief",
    dailyFocus:
      "Track patient inquiries, appointments, treatment opportunities, collections, and recall follow-ups.",
    labels: {
      customerSingular: "Patient",
      customerPlural: "Patients",
      leadSingular: "Inquiry",
      leadPlural: "Inquiries",
      jobSingular: "Appointment",
      jobPlural: "Appointments",
      saleSingular: "Collection",
      salePlural: "Collections",
      followUpPlural: "Patient follow-ups",
    },
    priorityNames: {
      pipeline: "Open treatment / inquiry value",
      activeWork: "Scheduled appointments",
      revenue: "Collections",
      followUps: "Patient follow-ups due",
      dataHealth: "Patient data health",
    },
    insightPrompts: [
      "Which patients need recall or treatment follow-up?",
      "Which inquiries have not converted into appointments?",
      "Which patient records are missing contact details?",
    ],
  },

  professional_services: {
    id: "professional_services",
    label: "Professional Services",
    headline: "Client work and proposal brief",
    dailyFocus:
      "Track clients, open proposals, active work, revenue, unpaid invoices, and relationship follow-ups.",
    labels: {
      customerSingular: "Client",
      customerPlural: "Clients",
      leadSingular: "Proposal",
      leadPlural: "Proposals",
      jobSingular: "Project",
      jobPlural: "Projects",
      saleSingular: "Invoice",
      salePlural: "Invoices",
      followUpPlural: "Client follow-ups",
    },
    priorityNames: {
      pipeline: "Open proposal value",
      activeWork: "Active projects",
      revenue: "Revenue",
      followUps: "Client follow-ups due",
      dataHealth: "Client data health",
    },
    insightPrompts: [
      "Which proposals need follow-up?",
      "Which clients have unpaid or partial invoices?",
      "Which active projects need better record tracking?",
    ],
  },

  retail: {
    id: "retail",
    label: "Retail / Local Store",
    headline: "Customer and sales activity brief",
    dailyFocus:
      "Track customer records, inquiries, sales, follow-ups, and revenue patterns for local retail operations.",
    labels: {
      customerSingular: "Customer",
      customerPlural: "Customers",
      leadSingular: "Inquiry",
      leadPlural: "Inquiries",
      jobSingular: "Order",
      jobPlural: "Orders",
      saleSingular: "Sale",
      salePlural: "Sales",
      followUpPlural: "Customer follow-ups",
    },
    priorityNames: {
      pipeline: "Open inquiry value",
      activeWork: "Open orders",
      revenue: "Sales revenue",
      followUps: "Customer follow-ups due",
      dataHealth: "Customer data health",
    },
    insightPrompts: [
      "Which customers should be followed up with?",
      "Which inquiries or orders are still open?",
      "Which products or services are driving revenue?",
    ],
  },
};

export const businessSectorOptions = Object.values(industryProfiles).map(
  (profile) => ({
    value: profile.id,
    label: profile.label,
  }),
);

export function getIndustryProfile(
  businessSector?: string | null,
): IndustryProfile {
  if (!businessSector) {
    return industryProfiles.general;
  }

  if (businessSector in industryProfiles) {
    return industryProfiles[businessSector as BusinessSector];
  }

  return industryProfiles.general;
}
