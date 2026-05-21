"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ProductMark } from "@/components/ProductMark";

type Props = {
  children: ReactNode;
  back?: { href: string; label: string };
  trailing?: ReactNode;
  companyName?: string;
};

export function MobileShell({ children, back, trailing, companyName }: Props) {
  return (
    <div className="flex flex-col min-h-screen bg-ud-page">
      {/* Header */}
      <header className="flex items-center justify-between px-[18px] pt-[6px] pb-[12px] gap-[10px] border-b border-ud/60 bg-ud-page/90 backdrop-blur-[20px] saturate-[160%] sticky top-0 z-20">
        {back ? (
          <Link
            href={back.href}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ud-accent active:opacity-60 transition-opacity duration-75"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            {back.label}
          </Link>
        ) : (
          <Link href="/workspace">
            <ProductMark companyName={companyName} />
          </Link>
        )}

        {trailing && (
          <div className="flex items-center gap-1">{trailing}</div>
        )}
      </header>

      {/* Scrollable content */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-none"
        style={{ paddingBottom: "calc(92px + env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
    </div>
  );
}
