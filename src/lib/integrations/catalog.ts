// The single source of truth for what shows up on the Integrations page:
// display metadata for the 5 providers that actually work today, plus
// every provider on the product roadmap shown as a "coming soon" tile so
// the page reflects the full plan without pretending unbuilt providers are
// connectable. Adding a new *working* provider means adding real
// start/callback routes (see quickbooks/jobber/square/stripe/hubspot for
// the pattern) and flipping `available: true` here -- nothing about the
// page itself needs to change.
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
  // Only true for providers with a real, working OAuth flow. Everything
  // else renders as a disabled "Coming soon" tile.
  available: boolean;
};

export const INTEGRATIONS_CATALOG: IntegrationMeta[] = [
  // Available now
  { provider: "quickbooks", name: "QuickBooks", category: "Accounting", description: "Sync customers, invoices, payments, and estimates.", available: true },
  { provider: "jobber", name: "Jobber", category: "Field Service", description: "Import clients, jobs, quotes, and scheduling.", available: true },
  { provider: "square", name: "Square", category: "Payments", description: "Sync customers, orders, and payment records.", available: true },
  { provider: "stripe", name: "Stripe", category: "Payments", description: "Sync customers, charges, and payouts.", available: true },
  { provider: "hubspot", name: "HubSpot", category: "CRM", description: "Import contacts and deal activity.", available: true },

  // Coming soon -- no working OAuth flow yet, needs real API credentials
  // from each provider's own developer portal before this can be built.
  { provider: "housecall-pro", name: "Housecall Pro", category: "Field Service", description: "Customers, jobs, estimates, invoices, and technicians.", available: false },
  { provider: "servicetitan", name: "ServiceTitan", category: "Field Service", description: "Customers, jobs, technicians, calls, and marketing attribution.", available: false },
  { provider: "buildertrend", name: "Buildertrend", category: "Construction", description: "Projects, budgets, change orders, and schedules.", available: false },
  { provider: "jobnimbus", name: "JobNimbus", category: "Construction", description: "Contacts, leads, jobs, and production tracking.", available: false },
  { provider: "procore", name: "Procore", category: "Construction", description: "Projects, contracts, RFIs, and submittals.", available: false },
  { provider: "xero", name: "Xero", category: "Accounting", description: "Customers, invoices, bills, and financial reports.", available: false },
  { provider: "gusto", name: "Gusto", category: "Payroll", description: "Employees, payroll, hours, and departments.", available: false },
  { provider: "adp", name: "ADP", category: "Payroll", description: "Employees, payroll, and labor costs.", available: false },
  { provider: "pipedrive", name: "Pipedrive", category: "CRM", description: "People, organizations, deals, and pipelines.", available: false },
];

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  "Accounting",
  "Field Service",
  "Construction",
  "Payroll",
  "Payments",
  "CRM",
];
