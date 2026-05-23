import { KpiCard } from "@/components/ui/KpiCard";
import { formatCurrency } from "@/lib/utils";
import type { RevenueForecast as ForecastData } from "@/lib/analytics/revenue-forecast";

type Props = {
  forecast: ForecastData;
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

export function RevenueForecast({ forecast }: Props) {
  const { nextMonthEstimate, trendDirection, trendPercent } = forecast;
  const absPercent = Math.abs(trendPercent);

  return (
    <KpiCard
      label="Revenue forecast (30d)"
      value={formatCurrency(nextMonthEstimate)}
      helper={`Based on last 90 days · ${absPercent}% trend`}
      delta={trendLabels[trendDirection]}
      deltaTone={trendDeltaTone[trendDirection]}
    />
  );
}
