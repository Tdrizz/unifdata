import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { LogoutButton } from "@/components/LogoutButton";
import { ProductMark } from "@/components/ProductMark";

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
    <div
      style={themeStyle}
      className="min-h-screen bg-[#eef2f7] text-slate-950"
    >
      <div className="flex min-h-screen">
        <aside className="hidden w-76 shrink-0 flex-col border-r border-slate-900 bg-[#090e1a] p-4 text-white md:flex">
          <Link
            href="/workspace"
            className="rounded-3xl border border-white/10 bg-white/6 p-4 shadow-sm hover:bg-white/10"
          >
            <ProductMark companyName={companyName} inverse />
          </Link>

          <div className="mt-6 flex-1 overflow-y-auto pr-1">
            <AppNav />
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/6 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Signed in
            </p>

            <p className="mt-2 truncate text-sm font-medium text-slate-300">
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

            <div className="mt-3">
              <AppNav mobile />
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto w-full max-w-360 px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
