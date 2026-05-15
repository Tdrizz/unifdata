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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-[15px] font-semibold text-slate-950">{value || "—"}</p>
      {helper && (
        <p className="mt-1 text-sm leading-5 text-slate-500">{helper}</p>
      )}
    </div>
  );
}
