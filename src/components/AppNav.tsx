"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getFlatProductNavigation,
  productNavigation,
} from "@/lib/product-navigation";

export function AppNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {getFlatProductNavigation().map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "shrink-0 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                  : "shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <nav className="space-y-6">
      {productNavigation.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {group.label}
          </p>

          <div className="mt-2 space-y-1">
            {group.items.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "group block rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-950 shadow-sm"
                      : "group block rounded-2xl px-4 py-3 text-slate-400 hover:bg-white/7 hover:text-white"
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.label}
                      </p>

                      <p
                        className={
                          active
                            ? "mt-0.5 truncate text-xs font-medium text-slate-500"
                            : "mt-0.5 truncate text-xs font-medium text-slate-600 group-hover:text-slate-400"
                        }
                      >
                        {item.description}
                      </p>
                    </div>

                    {active && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-slate-950" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
