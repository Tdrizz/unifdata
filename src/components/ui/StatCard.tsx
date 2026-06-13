const toneSurface: Record<string, string> = {
  default:  "bg-ud-surface border-ud",
  subtle:   "bg-ud-surface border-ud",
  positive: "bg-ud-success-bg border-ud-success/15",
  warning:  "bg-ud-warning-bg border-ud-warning/15",
  danger:   "bg-ud-danger-bg border-ud-danger/15",
  green:    "bg-ud-success-bg border-ud-success/15",
  blue:     "bg-ud-info-bg border-ud-info/15",
  amber:    "bg-ud-warning-bg border-ud-warning/15",
  red:      "bg-ud-danger-bg border-ud-danger/15",
};

export function StatCard({ label, value, helper, tone = "default" }: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: keyof typeof toneSurface;
}) {
  const surface = toneSurface[tone] ?? toneSurface.default;
  return (
    <div className={`rounded-[12px] border p-5 shadow-ud ${surface}`}>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ud-faint">{label}</p>
      <p className="mt-1.5 text-[28px] font-bold tracking-[-0.03em] leading-none text-ud-ink udv2-num">
        {value}
      </p>
      {helper && <p className="mt-1.5 text-[12px] text-ud-muted">{helper}</p>}
    </div>
  );
}
