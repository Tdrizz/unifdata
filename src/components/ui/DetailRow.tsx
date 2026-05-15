import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  label: string;
  children: ReactNode;
  isLast?: boolean;
  className?: string;
};

export function DetailRow({ label, children, isLast, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-4 py-[11px]",
        !isLast && "border-b border-ud-soft",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ud-faint leading-tight pt-[2px] shrink-0 w-[100px]">
        {label}
      </p>
      <div className="text-sm text-ud-text text-right flex-1 min-w-0">{children}</div>
    </div>
  );
}
