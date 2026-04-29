import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { ProductMark } from "@/components/ProductMark";

const navItems = [
  { href: "/workspace", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/leads", label: "Leads" },
  { href: "/jobs", label: "Jobs" },
  { href: "/sales", label: "Sales" },
  { href: "/follow-ups", label: "Follow-Ups" },
  { href: "/imports", label: "Imports" },
  { href: "/ai-assistant", label: "AI Assistant" },
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
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur md:flex md:flex-col">
          <Link
            href="/workspace"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-4 hover:bg-white"
          >
            <ProductMark companyName={companyName} />
          </Link>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-950 hover:text-white"
              >
                <span>{item.label}</span>
                <span className="text-xs opacity-50">→</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Signed in
            </p>

            <p className="mt-2 truncate text-sm font-semibold text-slate-700">
              {userEmail}
            </p>

            <div className="mt-4">
              <LogoutButton />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur md:hidden">
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
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
