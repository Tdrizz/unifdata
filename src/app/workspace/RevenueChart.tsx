type MonthSlot = {
  key: string;
  label: string;
  collected: number;
  uncollected: number;
};

export function computeMonthlyRevenue(
  records: Array<{
    amount: number | null;
    payment_status: string | null;
    sale_date: string | null;
  }>,
): MonthSlot[] {
  const now = new Date();
  const months: MonthSlot[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    return {
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      collected: 0,
      uncollected: 0,
    };
  });

  for (const record of records) {
    if (!record.sale_date || record.amount === null) continue;
    const parts = record.sale_date.split("-");
    if (parts.length < 2) continue;
    const key = `${parts[0]}-${parts[1]}`;
    const slot = months.find((m) => m.key === key);
    if (!slot) continue;
    const isPaid = String(record.payment_status ?? "").toLowerCase() === "paid";
    if (isPaid) {
      slot.collected += Number(record.amount);
    } else {
      slot.uncollected += Number(record.amount);
    }
  }

  return months;
}

export function RevenueChart({ months }: { months: MonthSlot[] }) {
  const maxVal = Math.max(...months.map((m) => m.collected + m.uncollected), 1);
  const chartH = 96;
  const groupW = 72;
  const barW = 18;
  const barGap = 5;
  const padX = 6;
  const totalW = months.length * groupW + padX * 2;
  const viewH = chartH + 32;

  const hasAnyData = months.some((m) => m.collected > 0 || m.uncollected > 0);

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500 opacity-85" />
          Collected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400 opacity-80" />
          Pending
        </span>
      </div>

      {!hasAnyData ? (
        <p className="py-8 text-center text-sm text-slate-400">
          No revenue records found for the past 6 months.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${totalW} ${viewH}`}
          className="w-full"
          role="img"
          aria-label="Monthly revenue for the last 6 months, showing collected and pending amounts as grouped bars"
        >
          {[0.25, 0.5, 0.75, 1].map((pct) => {
            const y = Math.round(chartH - pct * chartH);
            return (
              <line
                key={pct}
                x1={padX}
                y1={y}
                x2={totalW - padX}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
            );
          })}

          {months.map((m, i) => {
            const groupX = padX + i * groupW;
            const barStartX = groupX + (groupW - barW * 2 - barGap) / 2;

            const collectedH =
              m.collected > 0
                ? Math.max(Math.round((m.collected / maxVal) * chartH), 4)
                : 0;
            const uncollectedH =
              m.uncollected > 0
                ? Math.max(Math.round((m.uncollected / maxVal) * chartH), 4)
                : 0;

            return (
              <g key={m.key}>
                <rect
                  x={barStartX}
                  y={chartH - collectedH}
                  width={barW}
                  height={collectedH}
                  rx={3}
                  fill="#10b981"
                  fillOpacity={0.85}
                />
                <rect
                  x={barStartX + barW + barGap}
                  y={chartH - uncollectedH}
                  width={barW}
                  height={uncollectedH}
                  rx={3}
                  fill="#f59e0b"
                  fillOpacity={0.8}
                />
                <text
                  x={groupX + groupW / 2}
                  y={chartH + 20}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#94a3b8"
                >
                  {m.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
