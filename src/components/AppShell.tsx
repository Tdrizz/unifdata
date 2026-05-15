import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileTabBar } from "@/components/MobileTabBar";
import { ProductMark } from "@/components/ProductMark";
import { NotificationBell } from "@/components/NotificationBell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

type ThemeStyle = CSSProperties & {
  "--fo-primary"?: string;
  "--fo-accent"?: string;
};

export async function AppShell({
  children,
  companyName,
  userEmail,
  brandColor = "#1D2D3E",
  accentColor = "#7A8C2A",
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

  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();
  const { data: initialNotifications } = companyId
    ? await supabase
        .from("notifications")
        .select("id, type, title, body, read, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  return (
    <div
      style={themeStyle}
      className="min-h-screen bg-[#eef2f7] text-slate-950"
    >
      <div className="flex min-h-screen">
        <aside
          className="hidden w-72 shrink-0 flex-col gap-[18px] p-[18px] text-white md:flex"
          style={{ backgroundColor: "var(--fo-primary)" }}
        >
          <Link
            href="/workspace"
            className="rounded-3xl border border-white/8 bg-white/8 p-[14px] hover:bg-white/12"
          >
            <ProductMark companyName={companyName} inverse />
          </Link>

          <div className="flex-1 overflow-y-auto">
            <AppNav businessSector={businessSector} />
          </div>

          <div className="rounded-3xl border border-white/6 bg-white/6 p-[14px]">
            <div className="flex items-center gap-2.5">
              {companyId && (
                <NotificationBell
                  companyId={companyId}
                  initialNotifications={initialNotifications ?? []}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Signed in
                </p>
                <p className="mt-0.5 truncate text-[12.5px] font-medium text-white/85">
                  {userEmail}
                </p>
              </div>
            </div>
            <div className="mt-3">
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

              <div className="flex items-center gap-1">
                {companyId && (
                  <NotificationBell
                    companyId={companyId}
                    initialNotifications={initialNotifications ?? []}
                  />
                )}
                <LogoutButton />
              </div>
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
