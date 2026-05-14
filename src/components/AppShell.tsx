import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileTabBar } from "@/components/MobileTabBar";
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
  businessSector,
}: {
  children: ReactNode;
  companyName: string;
  userEmail: string;
  brandColor?: string;
  accentColor?: string;
  businessSector?: string | null;
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
        <aside
          className="hidden w-76 shrink-0 flex-col border-r border-white/10 p-4 text-white md:flex"
          style={{ backgroundColor: "var(--fo-primary)" }}
        >
          <Link
            href="/workspace"
            className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-sm hover:bg-white/15"
          >
            <ProductMark companyName={companyName} inverse />
          </Link>

          <div className="mt-6 flex-1 overflow-y-auto pr-1">
            <AppNav businessSector={businessSector} />
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
              Signed in
            </p>

            <p className="mt-2 truncate text-sm font-medium text-white/80">
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

          </header>

          <main className="flex-1 pb-16 md:pb-0">
            <div className="mx-auto w-full max-w-360 px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      <MobileTabBar businessSector={businessSector} accentColor={accentColor} />
    </div>
  );
}
