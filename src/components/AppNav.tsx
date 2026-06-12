"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getIndustryProfile } from "@/lib/industry-profiles";

function IconHome() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>; }
function IconUsers() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="7" r="3"/><path d="M2 21v-1a6 6 0 0 1 12 0v1"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M22 21v-1a4 4 0 0 0-3-3.87"/></svg>; }
function IconBriefcase() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/></svg>; }
function IconCalendar() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>; }
function IconDollar() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function IconBell() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function IconSparkles() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z"/><path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z"/></svg>; }
function IconDatabase() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>; }
function IconUpload() { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>; }
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
  agentInboxCount = 0,
}: {
  businessSector?: string | null;
  pendingProposals?: number;
  agentInboxCount?: number;
  unreadComms?: number;
}) {
  const pathname = usePathname();
  const profile = getIndustryProfile(businessSector);

  const workspaceItems: NavItem[] = [
    { href: "/workspace",  label: "Today",                         icon: <IconHome />,      match: (p) => p === "/workspace" },
    { href: "/customers",  label: profile.labels.customerPlural,   icon: <IconUsers />,     match: (p) => p === "/customers" || p.startsWith("/customers/") || p === "/contacts" || p.startsWith("/contacts/") },
    { href: "/crm",        label: "Pipeline",                      icon: <IconBriefcase />, match: (p) => p === "/crm" || p === "/leads" || p.startsWith("/leads/") },
    { href: "/jobs",       label: profile.labels.jobPlural,        icon: <IconCalendar />,  match: (p) => p === "/jobs" || p.startsWith("/jobs/") },
    { href: "/sales",      label: profile.labels.salePlural,       icon: <IconDollar />,    match: (p) => p === "/sales" || p.startsWith("/sales/") },
    { href: "/follow-ups", label: profile.labels.followUpPlural,   icon: <IconBell />,      match: (p) => p === "/follow-ups" || p.startsWith("/follow-ups/") },
  ];

  const intelligenceItems: NavItem[] = [
    {
      href: "/aria",
      label: "Aria",
      icon: <IconSparkles />,
      match: (p) => p === "/aria" || p === "/ai-assistant" || p.startsWith("/ai-assistant/"),
      badge: agentInboxCount > 0 ? agentInboxCount : undefined,
      accent: true,
    },
    {
      href: "/data-hub",
      label: "Data Hub",
      icon: <IconDatabase />,
      match: (p) => p === "/data-hub",
      badge: pendingProposals > 0 ? pendingProposals : undefined,
    },
    { href: "/imports", label: "Imports", icon: <IconUpload />, match: (p) => p === "/imports" || p.startsWith("/imports/") },
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
        {workspaceItems.map(renderItem)}
      </div>
      <div className="nav-group">
        <p className="nav-group-label">Intelligence</p>
        {intelligenceItems.map(renderItem)}
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
