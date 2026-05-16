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
    <header className={cn("flex flex-col justify-between gap-4 md:flex-row md:items-start", className)}>
      <div>
        {eyebrow && (
          <p className="text-[10.5px] font-semibold uppercase tracking-eyebrow text-ud-muted mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-ud-ink md:text-[32px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-[1.6] text-ud-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
