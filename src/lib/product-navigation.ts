import type { IndustryProfile } from "@/lib/industry-profiles";

type ProductNavItem = {
  href: string;
  label: string;
  description: string;
};

type ProductNavGroup = {
  label: string;
  items: ProductNavItem[];
};

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
          href: "/contacts",
          label: profile.labels.customerPlural,
          description: `${profile.labels.customerPlural} and contact records`,
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

