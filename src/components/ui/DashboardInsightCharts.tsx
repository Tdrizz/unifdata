"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendPoint = {
  label: string;
  revenue: number;
};

type ChartItem = {
  label: string;
  value: number;
};

const chartColors = [
  "#0f172a",
  "#334155",
  "#64748b",
  "#94a3b8",
  "#cbd5e1",
  "#f59e0b",
];

function formatCurrency(value: number) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function ChartShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <p className="max-w-xs text-sm leading-6 text-slate-500">{message}</p>
    </div>
  );
}

function DonutChartCard({
  data,
  valueFormatter,
}: {
  data: ChartItem[];
  valueFormatter?: (value: number) => string;
}) {
  if (data.length === 0) {
    return <EmptyChart message="Not enough data to display this chart yet." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr] lg:items-center">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(value) =>
                valueFormatter
                  ? valueFormatter(Number(value))
                  : Number(value).toLocaleString()
              }
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
              }}
            />

            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={58}
              outerRadius={92}
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.label}
                  fill={chartColors[index % chartColors.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {data.map((item, index) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: chartColors[index % chartColors.length],
                }}
              />
              <p className="truncate text-sm font-medium text-slate-700">
                {item.label}
              </p>
            </div>

            <p className="shrink-0 text-sm font-semibold text-slate-950">
              {valueFormatter ? valueFormatter(item.value) : item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardInsightCharts({
  revenueTrend,
  revenueByService,
  interestByService,
  pipelineBreakdown,
}: {
  revenueTrend: TrendPoint[];
  revenueByService: ChartItem[];
  interestByService: ChartItem[];
  pipelineBreakdown: ChartItem[];
}) {
  return (
    <div className="space-y-5">
      <ChartShell
        title="Revenue trend"
        description="Recorded revenue over the last six months."
      >
        {revenueTrend.length === 0 ? (
          <EmptyChart message="Add sales records to see revenue over time." />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={(value) => `$${Number(value) / 1000}k`}
                />

                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0f172a"
                  strokeWidth={3}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartShell>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartShell
          title="Revenue by service"
          description="Which services are producing the most money."
        >
          <DonutChartCard
            data={revenueByService}
            valueFormatter={formatCurrency}
          />
        </ChartShell>

        <ChartShell
          title="Interest by service"
          description="Which services customers are asking about most."
        >
          <DonutChartCard
            data={interestByService}
            valueFormatter={(value) =>
              `${value} ${value === 1 ? "record" : "records"}`
            }
          />
        </ChartShell>

        <ChartShell
          title="Pipeline status"
          description="Where current opportunities are sitting."
        >
          <DonutChartCard
            data={pipelineBreakdown}
            valueFormatter={(value) =>
              `${value} ${value === 1 ? "record" : "records"}`
            }
          />
        </ChartShell>
      </div>
    </div>
  );
}
