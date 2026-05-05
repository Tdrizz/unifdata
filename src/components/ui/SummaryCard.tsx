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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value || "—"}</p>
      {helper && (
        <p className="mt-1 text-sm leading-5 text-slate-500">{helper}</p>
      )}
    </div>
  );
}
