export type BusinessSector =
  | "general"
  | "field_service"
  | "construction"
  | "dental_medical"
  | "insurance"
  | "automotive"
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
      salePlural: "Revenue records",
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

  field_service: {
    id: "field_service",
    label: "Field Service / Local Services",
    headline: "Service operations view",
    dailyFocus:
      "Track clients, quotes, service work, payments, follow-ups, and service data quality.",
    labels: {
      customerSingular: "Client",
      customerPlural: "Clients",
      leadSingular: "Quote",
      leadPlural: "Quotes",
      jobSingular: "Service visit",
      jobPlural: "Service visits",
      saleSingular: "Payment",
      salePlural: "Payments",
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

  dental_medical: {
    id: "dental_medical",
    label: "Dental / Medical Office",
    headline: "Patient flow and collections view",
    dailyFocus:
      "Track patients, inquiries, treatment opportunities, appointments, collections, and patient follow-ups.",
    labels: {
      customerSingular: "Patient",
      customerPlural: "Patients",
      leadSingular: "Treatment opportunity",
      leadPlural: "Treatment opportunities",
      jobSingular: "Appointment",
      jobPlural: "Appointments",
      saleSingular: "Collection",
      salePlural: "Collections",
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

  insurance: {
    id: "insurance",
    label: "Insurance Agency",
    headline: "Client, policy, and renewal view",
    dailyFocus:
      "Track clients, policy opportunities, renewals, commissions, service actions, and client data quality.",
    labels: {
      customerSingular: "Client",
      customerPlural: "Clients",
      leadSingular: "Policy opportunity",
      leadPlural: "Policy opportunities",
      jobSingular: "Policy task",
      jobPlural: "Policy tasks",
      saleSingular: "Commission record",
      salePlural: "Commission records",
      followUpPlural: "Client actions",
    },
    priorityNames: {
      pipeline: "Open policy value",
      activeWork: "Active policy work",
      revenue: "Commission revenue",
      followUps: "Renewal actions due",
      dataHealth: "Client data quality",
    },
    insightPrompts: [
      "Which renewals or policy opportunities need follow-up?",
      "Which clients are missing policy or contact details?",
      "Which sources are producing the strongest client opportunities?",
    ],
  },

  automotive: {
    id: "automotive",
    label: "Auto Dealer / Vehicle Sales",
    headline: "Customer, deal, and sales view",
    dailyFocus:
      "Track customers, vehicle opportunities, appointments, deal progress, sales, and follow-ups.",
    labels: {
      customerSingular: "Customer",
      customerPlural: "Customers",
      leadSingular: "Vehicle opportunity",
      leadPlural: "Vehicle opportunities",
      jobSingular: "Deal task",
      jobPlural: "Deal tasks",
      saleSingular: "Vehicle sale",
      salePlural: "Vehicle sales",
      followUpPlural: "Customer actions",
    },
    priorityNames: {
      pipeline: "Open deal value",
      activeWork: "Active deal work",
      revenue: "Sales revenue",
      followUps: "Customer actions due",
      dataHealth: "Customer data quality",
    },
    insightPrompts: [
      "Which vehicle opportunities need follow-up?",
      "Which customers need appointment or financing follow-up?",
      "Which lead sources are producing the most deal value?",
    ],
  },

  professional_services: {
    id: "professional_services",
    label: "Professional Services",
    headline: "Client work and proposal view",
    dailyFocus:
      "Track clients, proposals, active work, invoices, revenue, and client follow-ups.",
    labels: {
      customerSingular: "Client",
      customerPlural: "Clients",
      leadSingular: "Proposal",
      leadPlural: "Proposals",
      jobSingular: "Project",
      jobPlural: "Projects",
      saleSingular: "Invoice",
      salePlural: "Invoices",
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

  retail: {
    id: "retail",
    label: "Retail / Local Store",
    headline: "Customer and sales activity view",
    dailyFocus:
      "Track customers, inquiries, orders, sales, follow-ups, and revenue patterns for local retail operations.",
    labels: {
      customerSingular: "Customer",
      customerPlural: "Customers",
      leadSingular: "Inquiry",
      leadPlural: "Inquiries",
      jobSingular: "Order",
      jobPlural: "Orders",
      saleSingular: "Sale",
      salePlural: "Sales",
      followUpPlural: "Customer actions",
    },
    priorityNames: {
      pipeline: "Open inquiry value",
      activeWork: "Open orders",
      revenue: "Sales revenue",
      followUps: "Customer actions due",
      dataHealth: "Customer data quality",
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
