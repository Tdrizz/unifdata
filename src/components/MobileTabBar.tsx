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
function SvgMessage({ active }: { active: boolean }) {
  return (
    <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.65} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
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

// ── "More" sheet icons (17px, matches AppNav's desktop set) ────────────────
function IconTools() { return <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.6 5.6L2 19l3 3 7.1-7.1a4 4 0 0 0 5.6-5.6L14.5 12 12 9.5l2.7-3.2z"/></svg>; }
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

  // Merging Leads/Jobs/Sales into one Pipeline tab (with follow-ups folded
  // in as per-card actions) and folding Vera into the Home dashboard freed
  // up a tab slot, so Communications -- previously buried in "More" -- is
  // now a primary tab too.
  const tabs = [
    {
      href: "/workspace",
      label: "Home",
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
      label: profile.pipelineLabel,
      Icon: SvgBriefcase,
      match: (p: string) =>
        p === "/crm" ||
        p === "/leads" || p.startsWith("/leads/") ||
        p.startsWith("/jobs/") ||
        p === "/sales" || p.startsWith("/sales/") ||
        p.startsWith("/follow-ups/"),
    },
    {
      href: "/communications",
      label: "Messages",
      Icon: SvgMessage,
      match: (p: string) => p === "/communications",
    },
  ];

  // Everything else -- Vera lives on Home now, and Data Hub/Imports are
  // reachable through the single Tools entry.
  const moreItems = [
    { href: "/tools", label: "Tools", Icon: IconTools },
    { href: "/settings", label: "Settings", Icon: IconSettings },
  ];

  const isMoreActive = [
    "/tools", "/data-hub", "/imports", "/settings",
  ].some((p) => pathname === p || pathname.startsWith(`${p}/`));

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

        {/* More — Tools and Settings, the only two destinations left outside
            the primary tabs. */}
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
