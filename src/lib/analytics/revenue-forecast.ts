import { linearRegression, linearRegressionLine } from "simple-statistics";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RevenueForecast = {
  nextMonthEstimate: number;
  trendDirection: "up" | "down" | "flat";
  trendPercent: number;
  dataPoints: number;
};

export type RevenueForecastResult =
  | { status: "ready"; forecast: RevenueForecast }
  | { status: "insufficient_data"; daysOfData: number }
  | { status: "no_sales"; daysOfData: 0 };

const MIN_DATA_POINTS = 14;
const LOOKBACK_DAYS = 90;

export async function computeRevenueForecast(
  supabase: SupabaseClient,
  companyId: string,
): Promise<RevenueForecastResult> {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);
  const sinceStr = since.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Fetch all days including today — needed for accurate progress count
  const { data: allRows } = await supabase
    .from("sales")
    .select("sale_date, amount")
    .eq("company_id", companyId)
    .gte("sale_date", sinceStr)
    .not("sale_date", "is", null)
    .gt("amount", 0)
    .order("sale_date", { ascending: true });

  if (!allRows || allRows.length === 0) return { status: "no_sales", daysOfData: 0 };

  // Epoch anchored to the first non-zero sale to avoid bias from $0 records
  const epoch = new Date(allRows[0].sale_date!).getTime();

  // Unique days including today — shown in the progress display
  const allDailyTotals = new Map<number, number>();
  for (const row of allRows) {
    const dayOffset = Math.round(
      (new Date(row.sale_date!).getTime() - epoch) / 86_400_000,
    );
    allDailyTotals.set(dayOffset, (allDailyTotals.get(dayOffset) ?? 0) + Number(row.amount));
  }

  // Regression points exclude today to avoid partial-day slope bias
  const dailyTotals = new Map<number, number>();
  for (const row of allRows.filter((r) => r.sale_date !== todayStr)) {
    const dayOffset = Math.round(
      (new Date(row.sale_date!).getTime() - epoch) / 86_400_000,
    );
    dailyTotals.set(dayOffset, (dailyTotals.get(dayOffset) ?? 0) + Number(row.amount));
  }

  const points: [number, number][] = Array.from(dailyTotals.entries()).sort(
    ([a], [b]) => a - b,
  );

  if (points.length < MIN_DATA_POINTS) {
    return { status: "insufficient_data", daysOfData: allDailyTotals.size };
  }

  const { m: slope, b: intercept } = linearRegression(points);
  const predict = linearRegressionLine({ m: slope, b: intercept });

  const todayOffset = Math.round((Date.now() - epoch) / 86_400_000);
  let nextMonthEstimate = 0;
  for (let d = todayOffset + 1; d <= todayOffset + 30; d++) {
    nextMonthEstimate += Math.max(0, predict(d));
  }

  const last30Actual = points
    .filter(([x]) => x >= todayOffset - 30)
    .reduce((sum, [, y]) => sum + y, 0);

  let trendPercent: number;
  if (last30Actual > 0) {
    trendPercent = Math.round(((nextMonthEstimate - last30Actual) / last30Actual) * 100);
  } else if (nextMonthEstimate > 0) {
    // No recent sales to compare against — use slope direction as a proxy
    trendPercent = slope > 0 ? 10 : -10;
  } else {
    trendPercent = 0;
  }

  const trendDirection =
    trendPercent > 2 ? "up" : trendPercent < -2 ? "down" : "flat";

  return {
    status: "ready",
    forecast: {
      nextMonthEstimate: Math.round(nextMonthEstimate),
      trendDirection,
      trendPercent: Math.abs(trendPercent),
      dataPoints: points.length,
    },
  };
}
