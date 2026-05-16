"use client";

import { computeMonthlyRevenue } from "@/app/workspace/RevenueChart";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Sale = {
  amount: number | null;
  payment_status: string | null;
  sale_date: string | null;
};

type Props = {
  sales: Sale[];
  className?: string;
};

export function RevenueChartCard({ sales, className }: Props) {
  const months = computeMonthlyRevenue(sales);
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const maxVal = Math.max(...months.map((m) => m.collected + m.uncollected), 1);
  const hasData = months.some((m) => m.collected > 0 || m.uncollected > 0);
  const currentMonth = months.find((m) => m.key === currentMonthKey);
  const currentTotal = currentMonth ? currentMonth.collected + currentMonth.uncollected : 0;
  const prevMonth = months[months.length - 2];
  const prevTotal = prevMonth ? prevMonth.collected + prevMonth.uncollected : 0;
  const delta = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

  return (
    <Card padding={0} radius="md" className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-ud-soft">
        <p className="text-[13px] font-semibold text-ud-ink">Revenue · 6 months</p>
        {hasData && (
          <div className="flex items-baseline gap-2">
            <span className="udv2-num text-[18px] font-semibold text-ud-ink tracking-[-0.02em]">
              {formatCurrency(currentTotal)}
            </span>
            {delta !== 0 && (
              <span
                className={cn(
                  "text-[11px] font-semibold px-1.5 py-[2px] rounded-[5px]",
                  delta > 0 ? "bg-[var(--ud-success-bg)] text-ud-success" : "bg-[var(--ud-danger-bg)] text-ud-danger",
                )}
              >
                {delta > 0 ? "+" : ""}{delta.toFixed(0)}% vs last
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-5 pt-4 pb-5">
        {!hasData ? (
          <p className="py-8 text-center text-[13px] text-ud-faint">No revenue data yet.</p>
        ) : (
          <div className="flex items-end gap-[6px] h-[130px]">
            {months.map((m) => {
              const total = m.collected + m.uncollected;
              const heightPct = maxVal > 0 ? (total / maxVal) * 100 : 0;
              const isCurrent = m.key === currentMonthKey;
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="udv2-num text-[9.5px] text-ud-faint leading-none">
                    {total > 0 ? (total >= 1000 ? `$${(total / 1000).toFixed(1)}k` : `$${total}`) : ""}
                  </span>
                  <div
                    className={cn(
                      "w-full rounded-t-[4px]",
                      isCurrent ? "bg-ud-accent" : "bg-ud-surface-sunk border border-ud",
                    )}
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                  <span className="text-[9.5px] text-ud-faint font-medium">{m.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
