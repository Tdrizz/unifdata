const toneAccent: Record<string, string> = {
  default: "bg-[#4A3FA8]",
  subtle: "bg-[#a8b96a]",
  positive: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  // backward-compatible aliases
  green: "bg-emerald-500",
  blue: "bg-[#4A3FA8]",
  amber: "bg-amber-500",
  red: "bg-red-500",
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
  tone?: keyof typeof toneAccent;
}) {
  const accent = toneAccent[tone] ?? toneAccent.default;

  return (
    <div className="relative overflow-hidden rounded-[12px] border border-ud bg-ud-surface p-4 shadow-ud">
      <div className={`absolute left-0 top-0 h-full w-[3px] ${accent}`} />

      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint">{label}</p>

      <p className="mt-[5px] text-[27px] font-bold tracking-[-0.03em] leading-none text-ud-ink" style={{fontVariantNumeric:"tabular-nums"}}>
        {value}
      </p>

      {helper && (
        <p className="mt-[5px] text-[11.5px] text-ud-muted">
          {helper}
        </p>
      )}
    </div>
  );
}
