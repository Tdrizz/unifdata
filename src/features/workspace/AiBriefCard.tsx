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

export function AiBriefCard({ eyebrow = "AI Operating Brief", body, bullets, actions, className }: Props) {
  return (
    <div className={cn("rounded-[14px] border border-white/[0.06] bg-gradient-to-br from-[#0d1520] to-[#1a2540] p-6", className)}>
      <p className="mb-[8px] flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B80E0]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#6B5FCC]" />
        {eyebrow}
      </p>
      <div className="text-[14px] leading-[1.65] text-[#c2d4e4]">
        {body}
      </div>
      {bullets && bullets.length > 0 && (
        <ul className="mt-[14px] flex flex-col gap-[7px]">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] text-[#96b0c4] leading-[1.5]">
              <span className="font-bold text-[#6B5FCC] shrink-0">→</span>
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
                action.variant === "primary" && "bg-white/[0.1] text-white hover:bg-white/[0.15]",
                action.variant === "accent" && "bg-[#4A3FA8] text-white hover:opacity-90",
                (!action.variant || action.variant === "secondary") && "bg-white/[0.07] border border-white/[0.1] text-[#c2d4e4] hover:bg-white/[0.12]",
                action.variant === "ghost" && "text-[#8B80E0] hover:text-white",
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
