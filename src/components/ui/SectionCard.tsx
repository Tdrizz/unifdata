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
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 md:flex-row md:items-center">
        <div>
          <h2 className="border-l-2 border-[#7A8C2A] pl-3 text-lg font-semibold tracking-tight text-slate-950">
            {title}
          </h2>

          {description && (
            <p className="mt-1 pl-3 text-sm leading-6 text-slate-500">
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
