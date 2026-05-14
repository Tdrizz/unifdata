"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getIndustryProfile } from "@/lib/industry-profiles";

const PRIMARY_TABS = [
  { href: "/workspace", label: "Home" },
  { href: "/customers", label: "Clients" },
  { href: "/jobs", label: "Jobs" },
  { href: "/sales", label: "Sales" },
  { href: "/follow-ups", label: "Follow-ups" },
];

export function MobileTabBar({
  businessSector,
  accentColor,
}: {
  businessSector?: string | null;
  accentColor?: string;
}) {
  const pathname = usePathname();
  const profile = getIndustryProfile(businessSector);

  const tabs = PRIMARY_TABS.map((tab) => {
    if (tab.href === "/customers") {
      return { ...tab, label: profile.labels.customerPlural };
    }
    return tab;
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200 bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={active ? { color: accentColor } : undefined}
            className={
              active
                ? "flex flex-1 flex-col items-center py-2 text-[10px] font-semibold"
                : "flex flex-1 flex-col items-center py-2 text-[10px] font-medium text-slate-500"
            }
          >
            <span
              className="mb-1 h-1 w-5 rounded-full"
              style={
                active
                  ? { backgroundColor: accentColor }
                  : { backgroundColor: "transparent" }
              }
            />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
