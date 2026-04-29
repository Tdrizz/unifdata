import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { ProductMark } from "@/components/ProductMark";

const navItems = [
  { href: "/workspace", label: "Dashboard", helper: "Overview" },
  { href: "/customers", label: "Customers", helper: "CRM" },
  { href: "/leads", label: "Leads", helper: "Pipeline" },
  { href: "/jobs", label: "Jobs", helper: "Operations" },
  { href: "/sales", label: "Sales", helper: "Revenue" },
  { href: "/follow-ups", label: "Follow-Ups", helper: "Reminders" },
  { href: "/imports", label: "Imports", helper: "Migration" },
  { href: "/ai-assistant", label: "AI Assistant", helper: "Insights" },
];

type ThemeStyle = CSSProperties & {
  "--fo-primary"?: string;
  "--fo-accent"?: string;
};

export function AppShell({
  children,
  companyName,
  userEmail,
  brandColor = "#0f172a",
  accentColor = "#2563eb",
}: {
  children: ReactNode;
  companyName: string;
  userEmail: string;
  brandColor?: string;
  accentColor?: string;
}) {
  const themeStyle: ThemeStyle = {
    "--fo-primary": brandColor,
    "--fo-accent": accentColor,
  };

  return (
    <div style={themeStyle} className="min-h-screen text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-[290px] shrink-0 flex-col bg-slate-950 p-4 text-white md:flex">
          <Link
            href="/workspace"
            className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-sm hover:bg-white/10"
          >
            <ProductMark companyName={companyName} inverse />
          </Link>

          <nav className="mt-5 space-y-1.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between rounded-2xl px-4 py-3 text-sm hover:bg-white/10"
              >
                <div>
                  <p className="font-bold text-slate-200 group-hover:text-white">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500 group-hover:text-slate-400">
                    {item.helper}
                  </p>
                </div>

                <span className="text-slate-600 opacity-0 group-hover:opacity-100">
                  →
                </span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Account
            </p>

            <p className="mt-2 truncate text-sm font-semibold text-slate-300">
              {userEmail}
            </p>

            <div className="mt-4">
              <LogoutButton variant="sidebar" />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur md:hidden">
            <div className="flex items-center justify-between gap-4">
              <Link href="/workspace">
                <ProductMark companyName={companyName} />
              </Link>

              <LogoutButton />
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
