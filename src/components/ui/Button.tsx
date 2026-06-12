import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:   "bg-ud-ink text-white border border-ud-ink hover:opacity-85",
  accent:    "bg-ud-accent text-white border border-ud-accent hover:opacity-90",
  secondary: "bg-ud-surface text-ud-ink border border-ud hover:border-ud-hard",
  ghost:     "bg-transparent text-ud-muted border border-transparent hover:bg-ud-surface-sunk hover:text-ud-ink",
  danger:    "bg-ud-surface text-ud-danger border border-ud hover:border-ud-danger/30 hover:bg-ud-danger-bg",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-[12px] rounded-[7px] gap-1",
  md: "px-3.5 py-2 text-[13px] rounded-[8px] gap-1.5",
  lg: "px-5 py-2.5 text-[14px] rounded-[10px] gap-2",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant = "primary", size = "md", className, children, ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center whitespace-nowrap font-semibold tracking-[-0.005em]",
        "transition-[color,background-color,border-color,opacity,transform] duration-[120ms] ease-out",
        "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
