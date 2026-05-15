import Link from "next/link";
import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileTabBar } from "@/components/MobileTabBar";
import { NotificationBell } from "@/components/NotificationBell";
import { ProductMark } from "@/components/ProductMark";
import { Topbar } from "@/components/Topbar";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

export async function AppShell({
  children,
  companyName,
  userEmail,
  userName,
  businessSector,
}: {
  children: ReactNode;
  companyName: string;
  userEmail: string;
  userName?: string;
  businessSector?: string | null;
  // v1 compat — kept but no longer applied to sidebar bg
  brandColor?: string;
  accentColor?: string;
}) {
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

  const displayName = userName || companyName || userEmail;

  return (
    <div className="flex min-h-screen bg-ud-page text-ud-text">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-[248px] shrink-0 flex-col border-r border-ud bg-ud-page">
        {/* Brand block */}
        <div className="px-[18px] py-[18px] pb-[14px] flex items-center justify-between">
          <Link href="/workspace">
            <ProductMark companyName={companyName} />
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center h-7 w-7 rounded-[7px] border border-ud bg-ud-surface text-ud-faint hover:text-ud-text hover:border-ud-hard transition-colors"
            aria-label="Switch workspace"
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        {/* Nav (includes ⌘K trigger) */}
        <div className="flex-1 overflow-y-auto px-[10px] pb-3">
          <AppNav businessSector={businessSector} />
        </div>

        {/* Account block */}
        <div className="px-[14px] py-[12px] border-t border-ud">
          <div className="flex items-center gap-2.5 mb-2">
            <Avatar name={displayName} size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-ud-ink truncate">
                {companyName || "My Workspace"}
              </p>
              <p className="text-[11px] text-ud-muted truncate">{userEmail}</p>
            </div>
            <button
              type="button"
              className="shrink-0 text-ud-faint hover:text-ud-text"
              aria-label="Account menu"
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
          <LogoutButton variant="sidebar" />
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-w-0 flex-col">
        {/* Desktop topbar */}
        <Topbar
          companyId={companyId}
          initialNotifications={initialNotifications ?? []}
          className="hidden md:flex"
        />

        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-ud bg-ud-page/95 backdrop-blur-sm">
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
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile tab bar */}
      <MobileTabBar businessSector={businessSector} />
    </div>
  );
}
