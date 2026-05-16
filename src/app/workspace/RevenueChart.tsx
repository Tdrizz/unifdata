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

function smoothPath(points: Array<[number, number]>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const cpx = (px + cx) / 2;
    d += ` C ${cpx} ${py}, ${cpx} ${cy}, ${cx} ${cy}`;
  }
  return d;
}

export function RevenueLineChart({ months }: { months: MonthSlot[] }) {
  const w = 440;
  const h = 100;
  const padX = 16;
  const padY = 12;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  const maxVal = Math.max(...months.map((m) => m.collected + m.uncollected), 1);
  const hasData = months.some((m) => m.collected > 0 || m.uncollected > 0);

  const toPoint = (val: number, i: number): [number, number] => [
    padX + (i / (months.length - 1)) * innerW,
    padY + innerH - (val / maxVal) * innerH,
  ];

  const collectedPts = months.map((m, i) => toPoint(m.collected, i));
  const totalPts = months.map((m, i) => toPoint(m.collected + m.uncollected, i));

  const collectedPath = smoothPath(collectedPts);
  const totalPath = smoothPath(totalPts);

  const areaClose = (pts: Array<[number, number]>) =>
    `${smoothPath(pts)} L ${pts[pts.length - 1][0]} ${h - padY + 2} L ${pts[0][0]} ${h - padY + 2} Z`;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: "#4A3FA8" }} />
          Collected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-slate-300" />
          Total incl. pending
        </span>
      </div>

      {!hasData ? (
        <p className="py-8 text-center text-sm text-slate-400">
          No revenue data in the past 6 months.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${w} ${h + 24}`}
          className="w-full"
          role="img"
          aria-label="Revenue trend over the last 6 months"
        >
          {/* Subtle gridlines */}
          {[0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padY + innerH - pct * innerH;
            return (
              <line
                key={pct}
                x1={padX}
                y1={y}
                x2={w - padX}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
            );
          })}

          {/* Total area (faint) */}
          <path d={areaClose(totalPts)} fill="#e2e8f0" fillOpacity={0.4} />

          {/* Collected area */}
          <path d={areaClose(collectedPts)} fill="#4A3FA8" fillOpacity={0.12} />

          {/* Total line */}
          <path
            d={totalPath}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />

          {/* Collected line */}
          <path
            d={collectedPath}
            fill="none"
            stroke="#4A3FA8"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots on collected line */}
          {collectedPts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3} fill="#4A3FA8" />
          ))}

          {/* Month labels */}
          {months.map((m, i) => (
            <text
              key={m.key}
              x={padX + (i / (months.length - 1)) * innerW}
              y={h + 18}
              textAnchor="middle"
              fontSize={10}
              fill="#94a3b8"
            >
              {m.label}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}

export function DataHealthRing({ score }: { score: number }) {
  const r = 36;
  const stroke = 9;
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;
  const color =
    score >= 90 ? "#10b981" : score >= 70 ? "#f59e0b" : "#ef4444";
  const label =
    score >= 90 ? "Healthy" : score >= 70 ? "Fair" : "Needs work";

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-28 h-28"
        role="img"
        aria-label={`Data health score: ${score}%`}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={stroke}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize={18}
          fontWeight="600"
          fill="#1D2D3E"
        >
          {score}%
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontSize={9}
          fill="#94a3b8"
        >
          health
        </text>
      </svg>
      <p className="text-xs font-semibold" style={{ color }}>{label}</p>
    </div>
  );
}
