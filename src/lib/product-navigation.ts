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
        label: "Brief",
        description: "What needs attention",
      },
    ],
  },
  {
    label: "Business Flow",
    items: [
      {
        href: "/crm",
        label: "Pipeline",
        description: "Relationships and opportunities",
      },
      {
        href: "/follow-ups",
        label: "Actions",
        description: "Tasks and next steps",
      },
    ],
  },
  {
    label: "Records",
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
        description: "Delivery and fulfillment",
      },
      {
        href: "/sales",
        label: "Revenue",
        description: "Payments and collections",
      },
    ],
  },
  {
    label: "Data",
    items: [
      {
        href: "/data-hub",
        label: "Data Hub",
        description: "Quality and completeness",
      },
      {
        href: "/imports",
        label: "Imports",
        description: "Bring in outside data",
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        href: "/ai-assistant",
        label: "AI Advisor",
        description: "Business summary",
      },
    ],
  },
];

export function getFlatProductNavigation() {
  return productNavigation.flatMap((group) => group.items);
}
