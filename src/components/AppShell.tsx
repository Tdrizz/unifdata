import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";

const navItems = [
  {
    href: "/workspace",
    label: "Dashboard",
  },
  {
    href: "/customers",
    label: "Customers",
  },
  {
    href: "/leads",
    label: "Leads",
  },
  {
    href: "/jobs",
    label: "Jobs",
  },
  {
    href: "/sales",
    label: "Sales",
  },
  {
    href: "/follow-ups",
    label: "Follow-Ups",
  },
  {
    href: "/imports",
    label: "Imports",
  },
  {
    href: "/ai-assistant",
    label: "AI Assistant",
  },
];

type ThemeStyle = CSSProperties & {
  "--app-primary"?: string;
  "--app-accent"?: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

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
    "--app-primary": brandColor,
    "--app-accent": accentColor,
  };

  const companyInitials = getInitials(companyName) || "FO";

  return (
    <div
      style={themeStyle}
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_30%,#f1f5f9_100%)] text-slate-950"
    >
      <div className="flex min-h-screen">
        <aside className="hidden w-76 shrink-0 flex-col border-r border-white/10 bg-[var(--app-primary)] p-5 text-white shadow-2xl md:flex">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <Link href="/workspace" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--app-accent)] text-sm font-black text-white shadow-lg">
                {companyInitials}
              </div>

              <div className="min-w-0">
                <p className="text-lg font-bold tracking-tight">FrontierOps</p>
                <p className="truncate text-xs text-slate-300">{companyName}</p>
              </div>
            </Link>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <span>{item.label}</span>
                <span className="opacity-0 transition group-hover:opacity-100">
                  →
                </span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Signed in
            </p>

            <p className="mt-2 truncate text-sm font-medium text-slate-200">
              {userEmail}
            </p>

            <div className="mt-4">
              <LogoutButton variant="sidebar" />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 px-4 py-3 shadow-sm backdrop-blur md:hidden">
            <div className="flex items-center justify-between gap-4">
              <Link href="/workspace" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--app-accent)] text-xs font-black text-white">
                  {companyInitials}
                </div>

                <div>
                  <p className="font-bold">FrontierOps</p>
                  <p className="text-xs text-slate-500">{companyName}</p>
                </div>
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

          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
