import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col justify-between gap-3 md:flex-row md:items-start", className)}>
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ud-faint mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[25px] font-bold leading-[1.15] tracking-[-0.025em] text-ud-ink [text-wrap:balance]">
          {title}
        </h1>
        {description && (
          <p className="hidden md:block mt-1.5 max-w-2xl text-[13.5px] leading-[1.6] text-ud-muted [text-wrap:pretty]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="hidden md:flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
