import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-start">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ud-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[24px] font-semibold leading-[1.2] tracking-[-0.02em] text-ud-ink md:text-[30px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-[1.6] text-ud-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
