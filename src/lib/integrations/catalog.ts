// The single source of truth for what shows up on the Integrations page.
// Only lists providers with a real, working OAuth flow -- adding a new one
// means building its real start/callback routes (see
// quickbooks/jobber/square/stripe/hubspot for the pattern) and adding its
// entry here at the same time, not listing it ahead of the work.
export type IntegrationCategory =
  | "Accounting"
  | "Field Service"
  | "Construction"
  | "Payroll"
  | "Payments"
  | "CRM";

export type IntegrationMeta = {
  // Matches the `integrations.provider` column and the
  // /api/integrations/<provider>/{start,callback} route segment.
  provider: string;
  name: string;
  category: IntegrationCategory;
  description: string;
};

export const INTEGRATIONS_CATALOG: IntegrationMeta[] = [
  { provider: "quickbooks", name: "QuickBooks", category: "Accounting", description: "Sync customers, invoices, payments, and estimates." },
  { provider: "jobber", name: "Jobber", category: "Field Service", description: "Import clients, jobs, quotes, and scheduling." },
  { provider: "square", name: "Square", category: "Payments", description: "Sync customers, orders, and payment records." },
  { provider: "stripe", name: "Stripe", category: "Payments", description: "Sync customers, charges, and payouts." },
  { provider: "hubspot", name: "HubSpot", category: "CRM", description: "Import contacts and deal activity." },
];

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  "Accounting",
  "Field Service",
  "Construction",
  "Payroll",
  "Payments",
  "CRM",
];
