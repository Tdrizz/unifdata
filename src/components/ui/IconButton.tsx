import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: number;
  active?: boolean;
  children: ReactNode;
};

export function IconButton({ size = 34, active, children, className, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center border border-ud rounded-[9px] text-ud-text transition-[color,background-color,border-color] duration-[120ms] ease-out active:scale-[0.96] hover:bg-ud-surface-soft",
        active ? "bg-ud-surface-sunk" : "bg-ud-surface",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {children}
    </button>
  );
}
