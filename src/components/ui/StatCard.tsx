const toneStyles = {
  default:  "border-slate-200 bg-white text-slate-950",
  subtle:   "border-slate-200 bg-slate-50 text-slate-950",
  positive: "border-slate-200 bg-white text-slate-950",
  warning:  "border-amber-200 bg-amber-50 text-amber-950",
  danger:   "border-red-200 bg-red-50 text-red-950",
  // backward-compatible aliases
  green:    "border-slate-200 bg-white text-slate-950",
  blue:     "border-slate-200 bg-white text-slate-950",
  amber:    "border-amber-200 bg-amber-50 text-amber-950",
  red:      "border-red-200 bg-red-50 text-red-950",
};

export function StatCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: keyof typeof toneStyles;
}) {
  return (
    <div className={`rounded-4xl border p-5 shadow-sm ${toneStyles[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">
        {value}
      </p>
      {helper && (
        <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
          {helper}
        </p>
      )}
    </div>
  );
}
