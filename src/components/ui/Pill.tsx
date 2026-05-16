import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "ink";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ud-surface-sunk text-ud-text",
  success: "bg-[var(--ud-success-bg)] text-ud-success",
  warning: "bg-[var(--ud-warning-bg)] text-ud-warning",
  danger:  "bg-[var(--ud-danger-bg)] text-ud-danger",
  info:    "bg-[var(--ud-info-bg)] text-ud-info",
  accent:  "bg-ud-accent-tint text-ud-accent",
  ink:     "bg-ud-ink text-ud-surface",
};

type Props = {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
};

export function Pill({ children, tone = "neutral", icon, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[10.5px] font-semibold leading-tight tracking-[0.01em]",
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
