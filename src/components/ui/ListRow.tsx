import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  isLast?: boolean;
  dense?: boolean;
  className?: string;
};

export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  onClick,
  isLast,
  dense,
  className,
}: Props) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-[14px] border-ud-soft",
        dense ? "py-[10px]" : "py-[13px]",
        !isLast && "border-b",
        onClick && "cursor-pointer hover:bg-ud-surface-soft transition-colors",
        className,
      )}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ud-ink tracking-[-0.005em] truncate">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-ud-muted mt-0.5 truncate">{subtitle}</p>
        )}
        {meta && <div className="mt-1">{meta}</div>}
      </div>
      {trailing && <div className="shrink-0 text-ud-faint">{trailing}</div>}
    </div>
  );
}
