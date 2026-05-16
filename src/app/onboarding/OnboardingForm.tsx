"use client";

import { useState } from "react";
import { businessSectorOptions } from "@/lib/industry-profiles";
import { createCompanyAction } from "./actions";

const INDUSTRY_ICONS: Record<string, string> = {
  general: "📊",
  medical: "🩺",
  construction: "🏗️",
  home_services: "⚙️",
  professional_services: "💼",
};

const INDUSTRY_DESCRIPTIONS: Record<string, string> = {
  general: "Any other business type",
  medical: "Medical, dental, chiropractic, veterinary",
  construction: "Contractors, builders, tradespeople",
  home_services: "HVAC, plumbing, landscaping, cleaning",
  professional_services: "Consulting, accounting, legal, IT",
};

export function OnboardingForm() {
  const [selectedSector, setSelectedSector] = useState("general");

  return (
    <form action={createCompanyAction} className="space-y-5">
      {/* Company name field */}
      <div>
        <label className="text-sm font-medium text-slate-200">Company name</label>
        <input
          name="companyName"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-[#4A3FA8]/40"
          placeholder="Arctic Ridge Services"
          required
        />
      </div>

      {/* Industry cards */}
      <div>
        <label className="text-sm font-medium text-slate-200">Business type</label>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          This controls the language and priorities shown across your workspace.
        </p>
        <input type="hidden" name="businessSector" value={selectedSector} />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {businessSectorOptions.map((option) => {
            const isActive = selectedSector === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedSector(option.value)}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all ${
                  isActive
                    ? "border-[#4A3FA8] bg-[rgba(74,63,168,0.15)] ring-1 ring-[#4A3FA8]"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-lg"
                  style={
                    isActive
                      ? { background: "rgba(74,63,168,0.3)" }
                      : { background: "rgba(255,255,255,0.08)" }
                  }
                >
                  {INDUSTRY_ICONS[option.value] ?? "📊"}
                </span>
                <div>
                  <p
                    className={`text-[13px] font-semibold leading-snug ${
                      isActive ? "text-white" : "text-slate-200"
                    }`}
                  >
                    {option.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                    {INDUSTRY_DESCRIPTIONS[option.value] ?? ""}
                  </p>
                </div>
                {isActive && (
                  <span className="ml-auto self-end rounded-full bg-[#4A3FA8] px-2 py-0.5 text-[10px] font-bold text-white">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Industry description */}
      <div>
        <label className="text-sm font-medium text-slate-200">
          Describe your work{" "}
          <span className="text-slate-400">(optional)</span>
        </label>
        <input
          name="industry"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-[#4A3FA8]/40"
          placeholder="Excavation, dental office, landscaping..."
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-2xl bg-[#4A3FA8] px-4 py-3.5 font-semibold text-white hover:bg-[#3D3494]"
      >
        Create workspace →
      </button>
    </form>
  );
}
