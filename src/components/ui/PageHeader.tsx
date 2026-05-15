import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm md:flex-row md:items-center">
      <div>
        {eyebrow && (
          <span className="inline-block rounded-full bg-[#f2f5e7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5a6820]">
            {eyebrow}
          </span>
        )}

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
