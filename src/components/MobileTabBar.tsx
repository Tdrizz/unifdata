"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { haptic } from "@/lib/haptics";

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
function SvgSparkles({ active }: { active: boolean }) {
  return (
    <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.65} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
      <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z"/>
      <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z"/>
    </svg>
  );
}

// ── Component ───────────────────────────────────────────────────────────────
export function MobileTabBar({
  businessSector,
}: {
  businessSector?: string | null;
}) {
  const pathname = usePathname();
  const profile = getIndustryProfile(businessSector);

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
    {
      href: "/aria",
      label: "Aria",
      Icon: SvgSparkles,
      match: (p: string) => p === "/aria" || p === "/ai-assistant" || p.startsWith("/ai-assistant/"),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-ud backdrop-blur-[24px] saturate-[160%]"
      style={{
        background: "var(--ud-tabbar-bg)",
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
    </nav>
  );
}
