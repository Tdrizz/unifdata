import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  body?: string;
  /** @deprecated use `body` instead. */
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, body, description, action }: Props) {
  const bodyText = body ?? description;
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-ud-surface-sunk text-ud-muted mb-4">
          {icon}
        </div>
      )}
      <p className="text-[15px] font-semibold text-ud-ink tracking-[-0.005em]">{title}</p>
      {bodyText && (
        <p className="mt-2 max-w-xs text-sm leading-6 text-ud-muted">{bodyText}</p>
      )}
      {action && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>
      )}
    </div>
  );
}
