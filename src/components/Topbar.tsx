"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/NotificationBell";
import { SidebarToggleButton } from "@/components/SidebarToggleButton";
import { getIndustryProfile } from "@/lib/industry-profiles";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

function buildBreadcrumbs(
  profile: ReturnType<typeof getIndustryProfile>,
): Record<string, [string, string]> {
  return {
    "/workspace":    ["Workspace", "Today"],
    "/customers":    ["Workspace", profile.labels.customerPlural],
    "/crm":          ["Workspace", "Pipeline"],
    "/leads":        ["Workspace", profile.labels.leadPlural],
    "/jobs":         ["Workspace", profile.labels.jobPlural],
    "/sales":        ["Workspace", profile.labels.salePlural],
    "/follow-ups":   ["Workspace", profile.labels.followUpPlural],
    "/ai-assistant": ["Intelligence", "AI Assistant"],
    "/data-hub":     ["Intelligence", "Data Hub"],
    "/imports":      ["Intelligence", "Imports"],
    "/settings":     ["Account", "Settings"],
    "/onboarding":   ["", "Onboarding"],
  };
}

function getBreadcrumb(
  pathname: string,
  breadcrumbs: Record<string, [string, string]>,
): [string, string] | null {
  if (breadcrumbs[pathname]) return breadcrumbs[pathname];
  const prefix = Object.keys(breadcrumbs).find(
    (k) => k !== "/workspace" && pathname.startsWith(k + "/"),
  );
  return prefix ? breadcrumbs[prefix] : null;
}

type Props = {
  companyId: string | null;
  initialNotifications: Notification[] | null;
  businessSector?: string | null;
};

export function Topbar({ companyId, initialNotifications, businessSector }: Props) {
  const pathname = usePathname();
  const profile = getIndustryProfile(businessSector);
  const breadcrumbs = buildBreadcrumbs(profile);
  const breadcrumb = getBreadcrumb(pathname, breadcrumbs);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <SidebarToggleButton />
        <span className="topbar-breadcrumb">
          {breadcrumb ? breadcrumb[1] : "UnifData"}
        </span>
      </div>
      <div className="topbar-right">
        {companyId && (
          <NotificationBell
            companyId={companyId}
            initialNotifications={initialNotifications ?? []}
          />
        )}
      </div>
    </header>
  );
}
