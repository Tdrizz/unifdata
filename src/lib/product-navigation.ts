import type { IndustryProfile } from "@/lib/industry-profiles";

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

export function getProductNavigation(profile: IndustryProfile): ProductNavGroup[] {
  return [
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
          description: `Open ${profile.labels.leadPlural.toLowerCase()}`,
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
          label: profile.labels.customerPlural,
          description: `${profile.labels.customerPlural} and contact records`,
        },
        {
          href: "/leads",
          label: profile.labels.leadPlural,
          description: `Potential business`,
        },
        {
          href: "/jobs",
          label: profile.labels.jobPlural,
          description: `Active ${profile.labels.jobPlural.toLowerCase()}`,
        },
        {
          href: "/sales",
          label: profile.labels.salePlural,
          description: `${profile.labels.salePlural} and collections`,
        },
        {
          href: "/follow-ups",
          label: profile.labels.followUpPlural,
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
}

export function getFlatProductNavigationForProfile(profile: IndustryProfile) {
  return getProductNavigation(profile).flatMap((group) => group.items);
}
