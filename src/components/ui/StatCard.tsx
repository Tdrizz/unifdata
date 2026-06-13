const toneSurface: Record<string, string> = {
  default:  "bg-ud-surface border-ud",
  subtle:   "bg-ud-surface border-ud",
  positive: "bg-emerald-50/70 border-emerald-100",
  warning:  "bg-ud-warning-bg/70 border-ud-warning/20",
  danger:   "bg-ud-danger-bg/60 border-ud-danger/20",
  green:    "bg-emerald-50/70 border-emerald-100",
  blue:     "bg-ud-surface border-ud",
  amber:    "bg-ud-warning-bg/70 border-ud-warning/20",
  red:      "bg-ud-danger-bg/60 border-ud-danger/20",
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
  tone?: keyof typeof toneSurface;
}) {
  const surface = toneSurface[tone] ?? toneSurface.default;

  return (
    <div className={`rounded-[16px] border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_6px_20px_rgba(0,0,0,0.05)] ${surface}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-ud-faint">{label}</p>

      <p className="mt-[6px] text-[30px] font-bold tracking-[-0.03em] leading-none text-ud-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>

      {helper && (
        <p className="mt-[6px] text-[12px] text-ud-muted">
          {helper}
        </p>
      )}
    </div>
  );
}
