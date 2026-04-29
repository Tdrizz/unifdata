"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navGroups = [
  {
    label: "Dashboards",
    items: [
      { href: "/workspace", label: "Overview", helper: "Executive view" },
      {
        href: "/crm",
        label: "CRM Dashboard",
        helper: "Pipeline and follow-up",
      },
      { href: "/data-hub", label: "Data Hub", helper: "Business records" },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/customers", label: "Customers", helper: "Contacts and notes" },
      { href: "/leads", label: "Leads", helper: "Opportunities" },
      { href: "/jobs", label: "Jobs", helper: "Scheduled work" },
      { href: "/sales", label: "Sales", helper: "Revenue" },
      { href: "/follow-ups", label: "Follow-Ups", helper: "Reminders" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/imports", label: "Imports", helper: "Data migration" },
      { href: "/ai-assistant", label: "AI Assistant", helper: "Insights" },
    ],
  },
];

export function AppNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  const allItems = navGroups.flatMap((group) => group.items);

  if (mobile) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {allItems.map((item) => {
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
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
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
                      ? "block rounded-2xl bg-white px-4 py-3 text-slate-950 shadow-sm"
                      : "block rounded-2xl px-4 py-3 text-slate-400 hover:bg-white/7 hover:text-white"
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p
                        className={
                          active
                            ? "mt-0.5 text-xs font-medium text-slate-500"
                            : "mt-0.5 text-xs font-medium text-slate-600"
                        }
                      >
                        {item.helper}
                      </p>
                    </div>

                    {active && (
                      <span className="h-2 w-2 rounded-full bg-slate-950" />
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
