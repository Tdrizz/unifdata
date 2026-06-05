type Props = {
  amountRecovered: number;
};

export function RoiCounter({ amountRecovered }: Props) {
  if (amountRecovered <= 0) return null;

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountRecovered);

  return (
    <div className="rounded-[var(--radius-ud-lg)] border border-[rgba(74,63,168,0.18)] bg-ud-accent-tint px-5 py-4 mb-5">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.10em] text-ud-accent mb-1">AI Impact</p>
      <p className="text-[15px] font-semibold text-ud-ink">
        AI recovered <span className="text-ud-accent">{formatted}</span> this month
      </p>
    </div>
  );
}
