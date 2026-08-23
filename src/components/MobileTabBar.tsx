"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { haptic } from "@/lib/haptics";
import { BottomSheet } from "@/components/ui/BottomSheet";

// ── Per-tab SVG icons (21px, variable strokeWidth) ─────────────────────────
function SvgHome({ active }: { active: boolean }) {
  return (
    <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.65} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}
function SvgUsers({ active }: { active: boolean }) {
  return (
    <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.65} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="7" r="3" />
      <path d="M2 21v-1a6 6 0 0 1 12 0v1" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M22 21v-1a4 4 0 0 0-3-3.87" />
    </svg>
  );
}
function SvgBriefcase({ active }: { active: boolean }) {
  return (
    <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.65} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M2 12h20" />
    </svg>
  );
}
function SvgCalendar({ active }: { active: boolean }) {
  return (
    <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.65} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function SvgMore({ active }: { active: boolean }) {
  return (
    <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.65} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ── "More" sheet icons (16px, matches AppNav's desktop set) ────────────────
function IconDollar() { return <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function IconBell() { return <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function IconDatabase() { return <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>; }
function IconUpload() { return <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>; }
function IconSettings() { return <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }

// ── Component ───────────────────────────────────────────────────────────────
export function MobileTabBar({
  businessSector,
}: {
  businessSector?: string | null;
}) {
  const pathname = usePathname();
  const profile = getIndustryProfile(businessSector);
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = [
    {
      href: "/workspace",
      label: "Today",
      Icon: SvgHome,
      match: (p: string) => p === "/workspace",
    },
    {
      href: "/customers",
      label: profile.labels.customerPlural,
      Icon: SvgUsers,
      match: (p: string) => p === "/customers" || p.startsWith("/customers/") || p === "/contacts" || p.startsWith("/contacts/"),
    },
    {
      href: "/crm",
      label: "Pipeline",
      Icon: SvgBriefcase,
      match: (p: string) => p === "/crm" || p === "/leads" || p.startsWith("/leads/"),
    },
    {
      href: "/jobs",
      label: profile.labels.jobPlural ?? "Jobs",
      Icon: SvgCalendar,
      match: (p: string) => p === "/jobs" || p.startsWith("/jobs/"),
    },
  ];

  // Every other primary destination the desktop nav (AppNav.tsx) exposes but
  // the 5-tab bar has no room for. Previously the ONLY way to reach these on
  // mobile was the search/command-palette icon — not discoverable.
  const moreItems = [
    { href: "/sales", label: profile.labels.salePlural ?? "Sales", Icon: IconDollar },
    { href: "/follow-ups", label: profile.labels.followUpPlural ?? "Follow-ups", Icon: IconBell },
    { href: "/data-hub", label: "Data Hub", Icon: IconDatabase },
    { href: "/imports", label: "Imports", Icon: IconUpload },
    { href: "/settings", label: "Settings", Icon: IconSettings },
  ];

  const isMoreActive = ["/sales", "/follow-ups", "/data-hub", "/imports", "/settings"].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const ariaTab = {
    href: "/aria",
    label: "Aria",
    match: (p: string) => p === "/aria" || p === "/ai-assistant" || p.startsWith("/ai-assistant/"),
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-ud backdrop-blur-[24px] saturate-[160%]"
        style={{
          background: "var(--ud-tabbar-bg)",
          minHeight: "var(--mobile-tabbar-h)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 9,
        }}
      >
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.Icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onTouchStart={() => haptic("light")}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 pb-1 active:opacity-60 transition-opacity duration-75",
                active ? "text-ud-accent" : "text-ud-faint",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-[46px] h-[28px] rounded-[10px] transition-colors duration-200",
                  active ? "bg-ud-accent/[0.10]" : "",
                )}
              >
                <Icon active={active} />
              </div>
              <span
                className={cn(
                  "text-[11px] tracking-[-0.005em]",
                  active ? "font-bold" : "font-medium",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* Aria keeps its own tab — it's the headline feature, not tucked in More */}
        <Link
          href={ariaTab.href}
          onTouchStart={() => haptic("light")}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 pb-1 active:opacity-60 transition-opacity duration-75",
            ariaTab.match(pathname) ? "text-ud-accent" : "text-ud-faint",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center w-[46px] h-[28px] rounded-[10px] transition-colors duration-200",
              ariaTab.match(pathname) ? "bg-ud-accent/[0.10]" : "",
            )}
          >
            <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ariaTab.match(pathname) ? 2.1 : 1.65} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z" />
              <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" />
            </svg>
          </div>
          <span className={cn("text-[11px] tracking-[-0.005em]", ariaTab.match(pathname) ? "font-bold" : "font-medium")}>
            Aria
          </span>
        </Link>

        {/* More — everything else the desktop nav exposes that doesn't fit
            in the tab bar. Previously only reachable via search/cmd+k. */}
        <button
          type="button"
          onClick={() => {
            haptic("light");
            setMoreOpen(true);
          }}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 pb-1 active:opacity-60 transition-opacity duration-75",
            isMoreActive ? "text-ud-accent" : "text-ud-faint",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center w-[46px] h-[28px] rounded-[10px] transition-colors duration-200",
              isMoreActive ? "bg-ud-accent/[0.10]" : "",
            )}
          >
            <SvgMore active={isMoreActive} />
          </div>
          <span className={cn("text-[11px] tracking-[-0.005em]", isMoreActive ? "font-bold" : "font-medium")}>
            More
          </span>
        </button>
      </nav>

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="flex flex-col gap-1 pb-2">
          {moreItems.map((item) => {
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-[10px] px-3 py-3 text-[15px] font-medium text-ud-ink active:bg-ud-surface-sunk"
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-[8px] bg-ud-surface-sunk text-ud-muted shrink-0">
                  <Icon />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
