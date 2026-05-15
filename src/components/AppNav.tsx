"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getFlatProductNavigation,
  getProductNavigation,
} from "@/lib/product-navigation";
import { getIndustryProfile } from "@/lib/industry-profiles";

export function AppNav({
  mobile = false,
  businessSector,
}: {
  mobile?: boolean;
  businessSector?: string | null;
}) {
  const pathname = usePathname();
  const profile = getIndustryProfile(businessSector);

  if (mobile) {
    const items = getFlatProductNavigation(profile);

    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={
                active
                  ? {
                      backgroundColor: "var(--fo-accent)",
                      color: "white",
                    }
                  : undefined
              }
              className={
                active
                  ? "shrink-0 rounded-full px-4 py-3 text-xs font-semibold shadow-sm"
                  : "shrink-0 rounded-full border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  const navGroups = getProductNavigation(profile);

  return (
    <nav className="space-y-5">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/45">
            {group.label}
          </p>

          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={
                    active
                      ? {
                          backgroundColor: "var(--fo-accent)",
                          color: "white",
                        }
                      : undefined
                  }
                  className={
                    active
                      ? "group flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-3 py-2.5"
                      : "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-white/62 hover:bg-white/10 hover:text-white"
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">
                      {item.label}
                    </p>
                    <p
                      className={
                        active
                          ? "mt-0.5 truncate text-[10.5px] font-medium text-white/75"
                          : "mt-0.5 truncate text-[10.5px] font-medium text-white/40 group-hover:text-white/60"
                      }
                    >
                      {item.description}
                    </p>
                  </div>

                  {active && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-white" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
