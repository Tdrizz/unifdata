import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  className?: string;
};

export function FilterChip({ children, active, count, onClick, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-[13px] py-[5px] rounded-[7px] text-[12.5px] font-semibold whitespace-nowrap transition-[color,background-color,box-shadow] duration-[120ms] ease-out active:scale-[0.96]",
        active
          ? "bg-ud-accent-tint text-ud-accent"
          : "bg-transparent text-ud-muted hover:text-ud-ink",
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn("text-[11px] font-bold", active ? "text-ud-accent/70" : "text-ud-faint")}>
          {count}
        </span>
      )}
    </button>
  );
}
