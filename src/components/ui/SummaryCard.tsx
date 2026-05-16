import type { ReactNode } from "react";

export function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
}) {
  return (
    <div className="rounded-[10px] border border-ud bg-ud-surface p-4 shadow-ud">
      <p className="text-sm font-medium text-ud-faint">{label}</p>
      <p className="mt-1 text-[15px] font-semibold text-ud-ink">{value || "—"}</p>
      {helper && (
        <p className="mt-1 text-sm leading-5 text-ud-faint">{helper}</p>
      )}
    </div>
  );
}
