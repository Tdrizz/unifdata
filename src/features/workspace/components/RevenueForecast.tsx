import { KpiCard } from "@/components/ui/KpiCard";
import { formatCurrency } from "@/lib/utils";
import type { RevenueForecastResult } from "@/lib/analytics/revenue-forecast";

type Props = {
  result: RevenueForecastResult;
};

const trendLabels: Record<string, string> = {
  up: "↑ trending up",
  down: "↓ trending down",
  flat: "→ stable",
};

const trendDeltaTone: Record<string, "up" | "down" | "flat"> = {
  up: "up",
  down: "down",
  flat: "flat",
};

export function RevenueForecast({ result }: Props) {
  if (result.status === "ready") {
    const { nextMonthEstimate, trendDirection, trendPercent } = result.forecast;
    const absPercent = Math.abs(trendPercent);
    return (
      <KpiCard
        label="Revenue Forecast"
        value={`~${formatCurrency(nextMonthEstimate)} next 30 days`}
        helper={`Based on last 90 days · ${absPercent}% trend`}
        delta={trendLabels[trendDirection]}
        deltaTone={trendDeltaTone[trendDirection]}
      />
    );
  }

  if (result.status === "insufficient_data") {
    return (
      <KpiCard
        label="Revenue Forecast"
        value={`${result.daysOfData}/14 days`}
        helper={`Forecast available after 14 days of sales data`}
      />
    );
  }

  // no_sales — show placeholder
  return (
    <KpiCard
      label="Revenue Forecast"
      value="0/14 days"
      helper="Log sales to unlock revenue forecasting"
    />
  );
}
