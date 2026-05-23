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
    .order("sale_date", { ascending: true });

  if (!rows || rows.length < MIN_DATA_POINTS) return null;

  // Group by day (x = days since first sale)
  const epoch = new Date(rows[0].sale_date!).getTime();
  const dailyTotals = new Map<number, number>();
  for (const row of rows) {
    const dayOffset = Math.round(
      (new Date(row.sale_date!).getTime() - epoch) / 86_400_000,
    );
    dailyTotals.set(dayOffset, (dailyTotals.get(dayOffset) ?? 0) + Number(row.amount || 0));
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

  // Compare last 30-day actual to forecast to derive trend
  const last30Start = todayOffset - 30;
  const last30Actual = points
    .filter(([x]) => x >= last30Start)
    .reduce((sum, [, y]) => sum + y, 0);

  const trendPercent =
    last30Actual > 0
      ? ((nextMonthEstimate - last30Actual) / last30Actual) * 100
      : 0;

  const trendDirection =
    trendPercent > 2 ? "up" : trendPercent < -2 ? "down" : "flat";

  return {
    nextMonthEstimate: Math.round(nextMonthEstimate),
    trendDirection,
    trendPercent: Math.round(trendPercent),
    dataPoints: points.length,
  };
}
