import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

const navItems = [
  {
    href: "/workspace",
    label: "Workspace",
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

export function AppShell({
  children,
  companyName,
  userEmail,
}: {
  children: React.ReactNode;
  companyName: string;
  userEmail: string;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white p-5 md:flex">
          <div>
            <Link href="/workspace" className="text-xl font-bold tracking-tight">
              FrontierOps
            </Link>

            <p className="mt-2 text-sm text-slate-500">{companyName}</p>
          </div>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-3 border-t border-slate-200 pt-5">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="truncate text-sm font-medium">{userEmail}</p>
            <LogoutButton />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:hidden">
            <div>
              <Link href="/workspace" className="font-bold">
                FrontierOps
              </Link>
              <p className="text-xs text-slate-500">{companyName}</p>
            </div>

            <LogoutButton />
          </header>

          <main className="flex-1 p-5 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}