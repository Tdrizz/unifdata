"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/NotificationBell";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

const BREADCRUMBS: Record<string, [string, string]> = {
  "/workspace":    ["Workspace", "Today"],
  "/customers":    ["Workspace", "Clients"],
  "/crm":          ["Workspace", "Pipeline"],
  "/leads":        ["Workspace", "Leads"],
  "/jobs":         ["Workspace", "Visits"],
  "/sales":        ["Workspace", "Revenue"],
  "/follow-ups":   ["Workspace", "Follow-ups"],
  "/ai-assistant": ["Intelligence", "AI Assistant"],
  "/data-hub":     ["Intelligence", "Data Hub"],
  "/imports":      ["Intelligence", "Imports"],
  "/settings":     ["Account", "Settings"],
  "/onboarding":   ["", "Onboarding"],
};

function getBreadcrumb(pathname: string): [string, string] | null {
  if (BREADCRUMBS[pathname]) return BREADCRUMBS[pathname];
  // match prefix for nested routes
  const prefix = Object.keys(BREADCRUMBS).find(
    (k) => k !== "/workspace" && pathname.startsWith(k + "/"),
  );
  return prefix ? BREADCRUMBS[prefix] : null;
}

type Props = {
  companyId: string | null;
  initialNotifications: Notification[] | null;
};

export function Topbar({ companyId, initialNotifications }: Props) {
  const pathname = usePathname();
  const breadcrumb = getBreadcrumb(pathname);

  return (
    <header className="topbar">
      <div className="topbar-left">
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
