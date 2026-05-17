import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function SectionCard({ title, description, children, actions }: Props) {
  return (
    <section className="overflow-hidden rounded-[12px] border border-ud bg-ud-surface shadow-ud">
      <div className="flex flex-col justify-between gap-3 border-b border-[rgba(0,0,0,0.045)] px-5 py-[15px] md:flex-row md:items-center">
        <div>
          <h2 className="text-[13.5px] font-semibold text-ud-ink">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[12px] text-ud-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}
