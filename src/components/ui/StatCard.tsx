const toneAccent: Record<string, string> = {
  default: "bg-[#7A8C2A]",
  subtle: "bg-[#a8b96a]",
  positive: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  // backward-compatible aliases
  green: "bg-emerald-500",
  blue: "bg-[#7A8C2A]",
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
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className={`absolute left-0 top-0 h-full w-[3px] ${accent}`} />

      <p className="text-[12px] font-medium text-slate-500">{label}</p>

      <p className="mt-1.5 text-[30px] font-bold tracking-[-0.025em] text-slate-950">
        {value}
      </p>

      {helper && (
        <p className="mt-1 text-[12px] font-medium text-slate-400">
          {helper}
        </p>
      )}
    </div>
  );
}
