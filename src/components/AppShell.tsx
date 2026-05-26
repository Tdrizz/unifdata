import Link from "next/link";
import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { CommandPalette } from "@/components/CommandPalette";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileTabBar } from "@/components/MobileTabBar";
import { NotificationBell } from "@/components/NotificationBell";
import { ProductMark } from "@/components/ProductMark";
import { MobileSearchButton } from "@/components/MobileSearchButton";
import { SidebarSearchButton } from "@/components/SidebarSearchButton";
import { Topbar } from "@/components/Topbar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

export async function AppShell({
  children,
  companyName,
  userEmail,
  userName: _userName,
  businessSector,
  hideMobileHeader,
  agentInboxCount = 0,
}: {
  children: ReactNode;
  companyName: string;
  userEmail: string;
  userName?: string; // kept for API compat
  businessSector?: string | null;
  hideMobileHeader?: boolean;
  agentInboxCount?: number;
}) {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const [notificationsResult, proposalsResult, unreadCommsResult] = await Promise.all([
    companyId
      ? supabase
          .from("notifications")
          .select("id, type, title, body, read, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    companyId
      ? supabase
          .from("data_reconciliation_proposals")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", companyId)
          .eq("status", "PENDING")
      : Promise.resolve({ count: 0 }),
    companyId
      ? (supabase as any)
          .from("communications")
          .select("unread_count")
          .eq("organization_id", companyId)
          .gt("unread_count", 0)
      : Promise.resolve({ data: [] }),
  ]);

  const initialNotifications = notificationsResult.data;
  const pendingProposals = proposalsResult.count ?? 0;
  const unreadComms = (unreadCommsResult.data ?? []).reduce(
    (sum: number, r: { unread_count: number }) => sum + (r.unread_count ?? 0),
    0
  );

  return (
    <>
      {/* ── Desktop shell ─────────────────────────────────────────────────── */}
      <div className="shell hidden md:flex">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Brand */}
          <div className="sidebar-brand">
            <Link href="/workspace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
              <div className="brand-mark">
                <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "20px", height: "20px" }}>
                  <circle cx="256" cy="256" r="170" fill="none" stroke="#E8EDF2" strokeWidth="26"/>
                  <rect x="238" y="64" width="36" height="52" rx="8" fill="#E8EDF2"/>
                  <rect x="238" y="396" width="36" height="52" rx="8" fill="#E8EDF2"/>
                  <rect x="64" y="238" width="52" height="36" rx="8" fill="#E8EDF2"/>
                  <rect x="396" y="238" width="52" height="36" rx="8" fill="#E8EDF2"/>
                  <circle cx="256" cy="256" r="142" fill="#1D2D3E"/>
                  <line x1="256" y1="190" x2="256" y2="270" stroke="#6B5FCC" strokeWidth="20" strokeLinecap="round"/>
                  <line x1="256" y1="222" x2="198" y2="222" stroke="#6B5FCC" strokeWidth="18" strokeLinecap="round"/>
                  <line x1="256" y1="254" x2="314" y2="254" stroke="#6B5FCC" strokeWidth="18" strokeLinecap="round"/>
                  <circle cx="194" cy="222" r="20" fill="none" stroke="#6B5FCC" strokeWidth="16"/>
                  <rect x="300" y="238" width="32" height="32" rx="5" fill="none" stroke="#6B5FCC" strokeWidth="16"/>
                  <circle cx="256" cy="316" r="24" fill="#6B5FCC"/>
                </svg>
              </div>
              <div className="brand-name"><span>UNIF</span><span>DATA</span></div>
            </Link>
          </div>

          {/* Search */}
          <SidebarSearchButton />

          {/* Nav */}
          <nav className="sidebar-nav">
            <AppNav businessSector={businessSector} pendingProposals={pendingProposals} agentInboxCount={agentInboxCount} />
          </nav>

          {/* Footer */}
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="user-avatar">
                {(companyName || userEmail || "U").charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{companyName || "My Workspace"}</div>
                <div className="user-email">{userEmail}</div>
              </div>
            </div>
            <LogoutButton variant="sidebar" />
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          <Topbar
            companyId={companyId}
            initialNotifications={initialNotifications ?? []}
            businessSector={businessSector}
          />
          <main className="content">
            {children}
          </main>
        </div>
      </div>

      {/* ── Mobile layout ─────────────────────────────────────────────────── */}
      <div className="flex flex-col min-h-[100dvh] md:hidden bg-ud-page overflow-x-hidden">
        {!hideMobileHeader && (
          <header
            className="sticky top-0 z-30 flex items-center justify-between px-4 border-b border-ud/60 bg-ud-page/95 backdrop-blur-[20px] saturate-[160%]"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)", paddingBottom: "12px" }}
          >
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
              <MobileSearchButton />
            </div>
          </header>
        )}
        <main className="flex-1 pb-[calc(80px+env(safe-area-inset-bottom))]">
          {children}
        </main>
      </div>

      {/* Mobile tab bar */}
      <MobileTabBar businessSector={businessSector} />

      {/* Command palette */}
      <CommandPalette businessSector={businessSector} />
    </>
  );
}
