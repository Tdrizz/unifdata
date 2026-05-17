import type { ReactNode } from "react";

export function SectionCard({ title, description, children, actions }: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[12px] border border-[rgba(23,22,20,0.08)] bg-ud-surface shadow-[0_1px_0_rgba(23,22,20,0.04),0_1px_2px_rgba(23,22,20,0.03)]">
      <div className="flex flex-col justify-between gap-3 border-b border-[rgba(23,22,20,0.05)] bg-ud-surface-soft px-5 py-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.005em] text-ud-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ud-muted">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}
