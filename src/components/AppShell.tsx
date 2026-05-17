import Link from "next/link";
import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { LogoutButton } from "@/components/LogoutButton";
import { ProductMark } from "@/components/ProductMark";
import { Topbar } from "@/components/Topbar";
import { Avatar } from "@/components/ui/Avatar";

export function AppShell({
  children,
  companyName,
  userEmail,
  businessSector,
}: {
  children: ReactNode;
  companyName: string;
  userEmail: string;
  brandColor?: string;
  accentColor?: string;
  businessSector?: string | null;
}) {
  const displayName = companyName || userEmail;

  return (
    <div className="flex min-h-screen bg-ud-page text-ud-text">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[248px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0c1117]">
        <div className="px-[18px] py-[18px] pb-[14px] border-b border-white/[0.07]">
          <Link href="/workspace">
            <ProductMark companyName={companyName} inverse />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-[10px] pb-3 pt-2">
          <AppNav businessSector={businessSector} />
        </div>

        <div className="px-[14px] py-[12px] border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5 mb-2">
            <Avatar name={displayName} size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-[#d0dae6] truncate">
                {companyName || "My Workspace"}
              </p>
              <p className="text-[11px] text-[#3d5166] truncate">{userEmail}</p>
            </div>
          </div>
          <LogoutButton variant="sidebar" />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 min-w-0 flex-col">
        {/* Desktop topbar */}
        <Topbar className="hidden md:flex" />

        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-[rgba(23,22,20,0.08)] bg-ud-page/95 backdrop-blur-sm">
          <Link href="/workspace">
            <ProductMark companyName={companyName} />
          </Link>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-6 py-7 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
