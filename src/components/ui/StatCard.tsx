const toneStyles = {
  default: "border-slate-200 bg-white text-slate-950",
  blue: "border-blue-100 bg-blue-50 text-blue-950",
  green: "border-emerald-100 bg-emerald-50 text-emerald-950",
  amber: "border-amber-100 bg-amber-50 text-amber-950",
  red: "border-red-100 bg-red-50 text-red-950",
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
    <div className={`rounded-3xl border p-5 shadow-sm ${toneStyles[tone]}`}>
      <p className="text-sm font-bold opacity-65">{label}</p>

      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>

      {helper && <p className="mt-2 text-xs leading-5 opacity-65">{helper}</p>}
    </div>
  );
}
