"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost" | "accent";
};

type Props = {
  eyebrow?: string;
  body: React.ReactNode;
  bullets?: string[];
  actions?: Action[];
  className?: string;
};

export function AiBriefCard({
  eyebrow = "AI Operating Brief",
  body,
  bullets,
  actions,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[14px] border border-ud-accent/20",
        "bg-gradient-to-br from-ud-accent-tint to-transparent",
        "p-6 pl-7",
        className,
      )}
    >
      {/* Accent rail */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-[14px] bottom-[14px] w-[3px] rounded-r bg-ud-accent"
      />

      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ud-accent">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-ud-accent" />
        {eyebrow}
      </p>

      <div className="text-[14px] leading-[1.65] text-ud-text">{body}</div>

      {bullets && bullets.length > 0 && (
        <ul className="mt-3.5 flex flex-col gap-[7px]">
          {bullets.map((bullet, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[13px] leading-[1.5] text-ud-muted"
            >
              <span className="shrink-0 font-bold text-ud-accent">→</span>
              {bullet}
            </li>
          ))}
        </ul>
      )}

      {actions && actions.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {actions.map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[9px] px-3 py-2 text-[12.5px] font-semibold transition-colors",
                (action.variant === "primary" || action.variant === "accent") &&
                  "bg-ud-accent text-white hover:opacity-90",
                (!action.variant || action.variant === "secondary") &&
                  "bg-ud-surface border border-ud text-ud-ink hover:border-ud-hard",
                action.variant === "ghost" &&
                  "text-ud-accent hover:text-ud-accent/80",
              )}
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
