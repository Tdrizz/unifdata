import { linearRegression, linearRegressionLine } from "simple-statistics";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RevenueForecast = {
  nextMonthEstimate: number;
  trendDirection: "up" | "down" | "flat";
  trendPercent: number;
  dataPoints: number;
};

const MIN_DATA_POINTS = 14;
const LOOKBACK_DAYS = 90;

export async function computeRevenueForecast(
  supabase: SupabaseClient,
  companyId: string,
): Promise<RevenueForecast | null> {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("sales")
    .select("sale_date, amount")
    .eq("company_id", companyId)
    .gte("sale_date", sinceStr)
    .not("sale_date", "is", null)
    .gt("amount", 0)       // skip $0 adjustments — they skew the epoch and regression
    .order("sale_date", { ascending: true });

  if (!rows || rows.length < MIN_DATA_POINTS) return null;

  // Epoch anchored to the first non-zero sale to avoid bias from $0 records
  const epoch = new Date(rows[0].sale_date!).getTime();
  const dailyTotals = new Map<number, number>();
  for (const row of rows) {
    const dayOffset = Math.round(
      (new Date(row.sale_date!).getTime() - epoch) / 86_400_000,
    );
    dailyTotals.set(dayOffset, (dailyTotals.get(dayOffset) ?? 0) + Number(row.amount));
  }

  const points: [number, number][] = Array.from(dailyTotals.entries()).sort(
    ([a], [b]) => a - b,
  );

  if (points.length < MIN_DATA_POINTS) return null;

  const { m: slope, b: intercept } = linearRegression(points);
  const predict = linearRegressionLine({ m: slope, b: intercept });

  // Estimate next 30 days from today
  const todayOffset = Math.round((Date.now() - epoch) / 86_400_000);
  let nextMonthEstimate = 0;
  for (let d = todayOffset + 1; d <= todayOffset + 30; d++) {
    nextMonthEstimate += Math.max(0, predict(d));
  }

  // Derive trend from the regression slope instead of last-30-day comparison.
  // Slope comparison is more robust: it works even when last30Actual=0 (seasonal gaps).
  // A slope covering 30 days = projected change over the next month.
  const projectedChange = slope * 30;
  const last30Actual = points
    .filter(([x]) => x >= todayOffset - 30)
    .reduce((sum, [, y]) => sum + y, 0);

  let trendPercent: number;
  if (last30Actual > 0) {
    trendPercent = Math.round(((nextMonthEstimate - last30Actual) / last30Actual) * 100);
  } else {
    // No recent actuals — use slope direction: +slope means growth
    trendPercent = Math.round(
      last30Actual === 0 && nextMonthEstimate > 0
        ? projectedChange > 0 ? 10 : -10   // directional signal, not a % vs 0
        : 0,
    );
  }

  const trendDirection =
    trendPercent > 2 ? "up" : trendPercent < -2 ? "down" : "flat";

  return {
    nextMonthEstimate: Math.round(nextMonthEstimate),
    trendDirection,
    trendPercent: Math.abs(trendPercent),
    dataPoints: points.length,
  };
}
