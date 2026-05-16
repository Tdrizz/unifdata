"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost" | "accent";
  icon?: ReactNode;
};

type Props = {
  eyebrow?: string;
  body: ReactNode;
  actions?: Action[];
  className?: string;
};

export function AiBriefCard({ eyebrow = "UnifData · Suggested action", body, actions, className }: Props) {
  return (
    <Card padding={22} className={cn("relative overflow-hidden", className)}>
      {/* Radial accent blob — decorative */}
      <div
        className="pointer-events-none absolute right-[-40px] top-[-40px] h-[220px] w-[220px] rounded-full"
        style={{ background: "radial-gradient(circle, var(--ud-accent-tint) 0%, transparent 70%)" }}
      />

      {/* Header */}
      <div className="relative flex items-center gap-2 mb-4">
        <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[6px] bg-ud-accent-tint">
          {/* Spark icon */}
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-ud-accent">
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z" />
            <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" />
          </svg>
        </div>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ud-muted">
          {eyebrow}
        </p>
      </div>

      {/* Body */}
      <div className="relative text-[15px] font-medium leading-[1.55] text-ud-text">
        {body}
      </div>

      {/* Footer actions */}
      {actions && actions.length > 0 && (
        <div className="relative mt-5 flex flex-wrap gap-2">
          {actions.map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[9px] px-3 py-2 text-[12.5px] font-semibold transition-colors",
                action.variant === "primary" && "bg-ud-ink text-ud-surface hover:bg-ud-text",
                action.variant === "accent" && "bg-ud-accent text-white hover:opacity-90",
                action.variant === "ghost" && "text-ud-muted hover:text-ud-text hover:bg-ud-surface-sunk",
                (!action.variant || action.variant === "secondary") && "bg-ud-surface border border-ud text-ud-text shadow-ud hover:border-ud-hard",
              )}
            >
              {action.icon && <span className="shrink-0">{action.icon}</span>}
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
