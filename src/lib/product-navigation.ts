export type ProductNavItem = {
  href: string;
  label: string;
  description: string;
};

export type ProductNavGroup = {
  label: string;
  items: ProductNavItem[];
};

export const productNavigation: ProductNavGroup[] = [
  {
    label: "Main",
    items: [
      {
        href: "/workspace",
        label: "Home",
        description: "What needs attention",
      },
      {
        href: "/crm",
        label: "Pipeline",
        description: "Open opportunities",
      },
      {
        href: "/data-hub",
        label: "Insights",
        description: "Trends and data quality",
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        href: "/customers",
        label: "People",
        description: "Customers, clients, or patients",
      },
      {
        href: "/leads",
        label: "Opportunities",
        description: "Potential business",
      },
      {
        href: "/jobs",
        label: "Work",
        description: "Jobs, projects, or appointments",
      },
      {
        href: "/sales",
        label: "Revenue",
        description: "Payments and collections",
      },
      {
        href: "/follow-ups",
        label: "Follow-Ups",
        description: "Next steps and reminders",
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        href: "/imports",
        label: "Import Data",
        description: "CSV and Google Sheets",
      },
      {
        href: "/ai-assistant",
        label: "AI Advisor",
        description: "Business summary",
      },
      {
        label: "Settings",
        href: "/settings",
        description: "Workspace, integrations, and account",
      },
    ],
  },
];

export function getFlatProductNavigation() {
  return productNavigation.flatMap((group) => group.items);
}
