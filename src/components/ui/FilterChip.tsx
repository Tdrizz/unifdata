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
        "inline-flex items-center gap-1.5 px-[11px] py-[6px] rounded-full text-xs font-semibold border whitespace-nowrap transition-colors",
        active
          ? "bg-ud-ink text-ud-surface border-ud-ink"
          : "bg-ud-surface text-ud-text border-ud hover:border-ud-hard",
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "text-[10px] font-bold",
            active ? "opacity-70" : "text-ud-faint",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
