import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function SectionCard({ title, description, children, actions }: Props) {
  return (
    <section className="overflow-hidden rounded-[16px] border border-[rgba(0,0,0,0.06)] bg-ud-surface shadow-[0_2px_8px_rgba(0,0,0,0.08),0_6px_20px_rgba(0,0,0,0.05)]">
      <div className="flex flex-col justify-between gap-3 border-b border-[rgba(0,0,0,0.05)] px-5 py-[16px] md:flex-row md:items-center">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ud-ink">
            {title}
          </h2>
          {description && (
            <p className="mt-[3px] text-[12px] leading-[1.5] text-ud-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}
