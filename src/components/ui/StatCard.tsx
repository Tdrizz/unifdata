const toneStyles = {
  default: {
    card: "border-slate-200 bg-white text-slate-950",
    accent: "bg-[#7A8C2A]",
  },
  subtle: {
    card: "border-slate-200 bg-slate-50 text-slate-950",
    accent: "bg-[#a8b96a]",
  },
  positive: {
    card: "border-slate-200 bg-white text-slate-950",
    accent: "bg-emerald-500",
  },
  warning: {
    card: "border-amber-200 bg-amber-50 text-amber-950",
    accent: "bg-amber-500",
  },
  danger: {
    card: "border-red-200 bg-red-50 text-red-950",
    accent: "bg-red-500",
  },

  // Backward-compatible aliases so older pages don't break
  green: {
    card: "border-slate-200 bg-white text-slate-950",
    accent: "bg-emerald-500",
  },
  blue: {
    card: "border-slate-200 bg-white text-slate-950",
    accent: "bg-[#7A8C2A]",
  },
  amber: {
    card: "border-amber-200 bg-amber-50 text-amber-950",
    accent: "bg-amber-500",
  },
  red: {
    card: "border-red-200 bg-red-50 text-red-950",
    accent: "bg-red-500",
  },
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
  const styles = toneStyles[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm ${styles.card}`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${styles.accent}`} />

      <p className="text-sm font-medium text-slate-500">{label}</p>

      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
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
