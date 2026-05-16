"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// ── Icons (16px, strokeWidth 1.7) ──────────────────────────────────────────
function IconHome() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="7" r="3" />
      <path d="M2 21v-1a6 6 0 0 1 12 0v1" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M22 21v-1a4 4 0 0 0-3-3.87" />
    </svg>
  );
}
function IconBriefcase() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M2 12h20" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconDollar() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function IconSparkles() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z" />
      <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" />
    </svg>
  );
}
function IconBarChart() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// ── Nav config ─────────────────────────────────────────────────────────────
type NavItem = {
  href: string;
  label: string;
  icon: () => React.ReactElement;
  accent?: boolean;
  badge?: string;
};
type NavGroup = { label: string; items: NavItem[] };

function buildNavGroups(profile: ReturnType<typeof getIndustryProfile>): NavGroup[] {
  return [
    {
      label: "Workspace",
      items: [
        { href: "/workspace",  label: "Today",                               icon: IconHome },
        { href: "/customers",  label: profile.labels.customerPlural,         icon: IconUsers },
        { href: "/crm",        label: "Pipeline",                            icon: IconBriefcase },
        { href: "/jobs",       label: profile.labels.jobPlural ?? "Visits",  icon: IconCalendar },
        { href: "/sales",      label: profile.labels.salePlural ?? "Revenue",icon: IconDollar },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { href: "/follow-ups",   label: profile.labels.followUpPlural ?? "Follow-ups", icon: IconCheck },
        { href: "/ai-assistant", label: "AI Assistant",                                 icon: IconSparkles, accent: true },
        { href: "/data-hub",     label: "Data Hub",                                     icon: IconBarChart },
        { href: "/imports",      label: "Imports",                                       icon: IconUpload },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/settings", label: "Settings", icon: IconSettings },
      ],
    },
  ];
}

function isActive(pathname: string, href: string) {
  if (href === "/workspace") return pathname === "/workspace";
  return pathname === href || pathname.startsWith(href + "/");
}

// ── Component ───────────────────────────────────────────────────────────────
export function AppNav({ businessSector }: { businessSector?: string | null }) {
  const pathname = usePathname();
  const profile = getIndustryProfile(businessSector);
  const groups = buildNavGroups(profile);

  return (
    <div className="flex flex-col">
      {/* ⌘K search trigger */}
      <div className="px-[14px] pb-[12px]">
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
          }}
          className="flex w-full items-center gap-2 rounded-[8px] bg-ud-surface-sunk px-[10px] py-[7px] text-[12.5px] text-ud-faint hover:bg-ud-surface transition-colors"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="flex-1 text-left">Search workspace…</span>
          <kbd className="font-mono text-[10px] bg-ud-surface border border-ud rounded-[4px] px-[5px] py-[2px] text-ud-faint leading-none">⌘K</kbd>
        </button>
      </div>

      {/* Nav groups */}
      {groups.map((group) => (
        <div key={group.label} className="mb-2">
          <p className="mb-1 px-[9px] text-[10px] font-bold uppercase tracking-eyebrow text-ud-faint">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-[9px] px-[9px] py-[7px] rounded-[8px] border transition-all text-[13px]",
                    active
                      ? "bg-ud-surface text-ud-ink border-ud shadow-ud font-semibold"
                      : cn(
                          "border-transparent font-medium hover:bg-ud-surface-soft",
                          item.accent ? "text-ud-accent" : "text-ud-text",
                        ),
                  )}
                >
                  <span className={cn(
                    "shrink-0",
                    active ? "text-ud-ink" : item.accent ? "text-ud-accent" : "text-ud-muted",
                  )}>
                    <Icon />
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className={cn(
                      "udv2-num text-[10.5px] font-bold rounded-[4px] px-[5px] py-[1px] leading-none",
                      active ? "bg-ud-surface-sunk text-ud-muted" : "text-ud-faint",
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Theme toggle */}
      <div className="mt-1 px-[9px]">
        <ThemeToggle />
      </div>
    </div>
  );
}
