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
    label: "Today",
    items: [
      {
        href: "/workspace",
        label: "Overview",
        description: "Daily operating brief",
      },
    ],
  },
  {
    label: "Workflows",
    items: [
      {
        href: "/crm",
        label: "Relationships",
        description: "Pipeline and follow-up",
      },
      {
        href: "/follow-ups",
        label: "Action Queue",
        description: "Tasks and reminders",
      },
    ],
  },
  {
    label: "Records",
    items: [
      {
        href: "/customers",
        label: "Customers",
        description: "Contacts and notes",
      },
      {
        href: "/leads",
        label: "Opportunities",
        description: "Leads, quotes, estimates",
      },
      {
        href: "/jobs",
        label: "Work",
        description: "Jobs and projects",
      },
      {
        href: "/sales",
        label: "Revenue",
        description: "Sales and payments",
      },
    ],
  },
  {
    label: "Data",
    items: [
      {
        href: "/data-hub",
        label: "Data Hub",
        description: "Record quality and access",
      },
      {
        href: "/imports",
        label: "Imports",
        description: "Data migration",
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        href: "/ai-assistant",
        label: "AI Advisor",
        description: "Summaries and next steps",
      },
    ],
  },
];

export function getFlatProductNavigation() {
  return productNavigation.flatMap((group) => group.items);
}
