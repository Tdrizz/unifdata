import type { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>

        {actions && <div>{actions}</div>}
      </div>

      <div>{children}</div>
    </section>
  );
}
