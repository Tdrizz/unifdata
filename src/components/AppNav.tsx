"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getIndustryProfile } from "@/lib/industry-profiles";

function IconHome() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>; }
function IconUsers() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="7" r="3"/><path d="M2 21v-1a6 6 0 0 1 12 0v1"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M22 21v-1a4 4 0 0 0-3-3.87"/></svg>; }
function IconBriefcase() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/></svg>; }
function IconBell() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function IconMessage() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>; }
function IconTools() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.6 5.6L2 19l3 3 7.1-7.1a4 4 0 0 0 5.6-5.6L14.5 12 12 9.5l2.7-3.2z"/></svg>; }
function IconSettings() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (p: string) => boolean;
  badge?: number;
  accent?: boolean;
};

export function AppNav({
  businessSector,
  pendingProposals = 0,
  unreadComms = 0,
}: {
  businessSector?: string | null;
  pendingProposals?: number;
  agentInboxCount?: number;
  unreadComms?: number;
}) {
  const pathname = usePathname();
  const profile = getIndustryProfile(businessSector);

  // One dashboard (Home), one merged Pipeline (leads/jobs/sales), Contacts,
  // Follow-ups, and Communications -- everything else (Vera, Data Hub,
  // Automations, Process, Imports) is either folded into Home (Vera) or
  // reachable through the single Tools entry below, instead of each being a
  // co-equal top-level destination.
  const primaryItems: NavItem[] = [
    { href: "/workspace", label: "Home", icon: <IconHome />, match: (p) => p === "/workspace" },
    { href: "/customers", label: profile.labels.customerPlural, icon: <IconUsers />, match: (p) => p === "/customers" || p.startsWith("/customers/") || p === "/contacts" || p.startsWith("/contacts/") },
    {
      href: "/crm",
      label: "Pipeline",
      icon: <IconBriefcase />,
      match: (p) =>
        p === "/crm" ||
        p === "/leads" || p.startsWith("/leads/") ||
        p === "/jobs" || p.startsWith("/jobs/") ||
        p === "/sales" || p.startsWith("/sales/"),
    },
    { href: "/follow-ups", label: profile.labels.followUpPlural, icon: <IconBell />, match: (p) => p === "/follow-ups" || p.startsWith("/follow-ups/") },
    {
      href: "/communications",
      label: "Communications",
      icon: <IconMessage />,
      match: (p) => p === "/communications",
      badge: unreadComms > 0 ? unreadComms : undefined,
    },
  ];

  const secondaryItems: NavItem[] = [
    {
      href: "/tools",
      label: "Tools",
      icon: <IconTools />,
      match: (p) =>
        p === "/tools" ||
        p === "/data-hub" ||
        p === "/automations" ||
        p === "/process" ||
        p === "/imports" || p.startsWith("/imports/"),
      badge: pendingProposals > 0 ? pendingProposals : undefined,
    },
  ];

  const renderItem = (item: NavItem) => {
    const active = item.match(pathname);
    return (
      <Link key={item.href} href={item.href} className={cn("nav-item", active && "active", item.accent && "accent")}>
        <span className="nav-icon">{item.icon}</span>
        <span className="nav-label">{item.label}</span>
        {item.badge ? <span className="nav-badge">{item.badge > 9 ? "9+" : item.badge}</span> : null}
      </Link>
    );
  };

  const settingsActive = pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <>
      <div className="nav-group">
        <p className="nav-group-label">Workspace</p>
        {primaryItems.map(renderItem)}
      </div>
      <div className="nav-group">
        {secondaryItems.map(renderItem)}
      </div>
      <div className="nav-group">
        <Link href="/settings" className={cn("nav-item", settingsActive && "active")}>
          <span className="nav-icon"><IconSettings /></span>
          <span className="nav-label">Settings</span>
        </Link>
      </div>
    </>
  );
}
