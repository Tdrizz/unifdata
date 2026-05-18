"use client";

import { useState } from "react";

type Sector = {
  sector: string;
  focus: string;
  metrics: string[][];
  insights: string[];
};

export function SectorSelector({ sectors }: { sectors: Sector[] }) {
  const [active, setActive] = useState(0);
  const s = sectors[active];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {sectors.map((sector, i) => (
          <button
            key={sector.sector}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition-[color,background-color,border-color] duration-[120ms] ease-out active:scale-[0.96] ${
              i === active
                ? "bg-white text-slate-950"
                : "border border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/8 hover:text-white"
            }`}
          >
            {sector.sector}
          </button>
        ))}
      </div>

      {/* Active sector panel */}
      <div className="mt-6 overflow-hidden rounded-[20px] border border-white/10 bg-white/4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/8 p-6">
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Industry workspace
            </p>
            <h3 className="mt-1.5 text-[22px] font-semibold tracking-tight">{s.sector}</h3>
            <p className="mt-1.5 max-w-xl text-[14px] leading-[1.6] text-slate-400">{s.focus}</p>
          </div>
          <span className="shrink-0 rounded-full border border-[#4A3FA8]/30 bg-[#4A3FA8]/15 px-3 py-1 text-[11px] font-semibold text-[#8B80E0]">
            Tailored
          </span>
        </div>

        {/* Body: metrics + insights side by side on desktop */}
        <div className="grid gap-0 lg:grid-cols-[1fr_1fr]">
          {/* Metrics */}
          <div className="grid grid-cols-2 divide-x divide-y divide-white/6 border-b border-white/8 lg:border-b-0 lg:border-r">
            {s.metrics.map(([label, value]) => (
              <div key={label} className="p-5">
                <p className="text-[11.5px] font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-[26px] font-semibold leading-none">{value}</p>
              </div>
            ))}
          </div>

          {/* Insights */}
          <div className="p-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              What the owner sees today
            </p>
            <div className="mt-4 grid gap-2.5">
              {s.insights.map((insight) => (
                <div
                  key={insight}
                  className="flex items-start gap-3 rounded-[10px] bg-white/5 px-4 py-3 text-[13.5px] leading-[1.55] text-slate-300"
                >
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B80E0]" />
                  {insight}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
