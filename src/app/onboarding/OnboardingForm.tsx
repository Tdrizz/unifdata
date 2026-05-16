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
        <label className="text-sm font-medium text-ud-ink">Company name</label>
        <input
          name="companyName"
          className="mt-2 w-full rounded-[10px] border border-white/10 bg-white px-4 py-3 text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40"
          placeholder="Arctic Ridge Services"
          required
        />
      </div>

      {/* Industry cards */}
      <div>
        <label className="text-sm font-medium text-ud-ink">Business type</label>
        <p className="mt-1 text-xs leading-5 text-ud-faint">
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
                className={`flex flex-col items-start gap-2 rounded-[10px] border p-3.5 text-left transition-all ${
                  isActive
                    ? "border-ud-accent bg-[rgba(74,63,168,0.15)] ring-1 ring-ud-accent"
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
                      isActive ? "text-white" : "text-ud-ink"
                    }`}
                  >
                    {option.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-ud-faint">
                    {INDUSTRY_DESCRIPTIONS[option.value] ?? ""}
                  </p>
                </div>
                {isActive && (
                  <span className="ml-auto self-end rounded-full bg-ud-accent px-2 py-0.5 text-[10px] font-bold text-white">
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
        <label className="text-sm font-medium text-ud-ink">
          Describe your work{" "}
          <span className="text-ud-faint">(optional)</span>
        </label>
        <input
          name="industry"
          className="mt-2 w-full rounded-[10px] border border-white/10 bg-white px-4 py-3 text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40"
          placeholder="Excavation, dental office, landscaping..."
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-[10px] bg-ud-accent px-4 py-3.5 font-semibold text-white hover:opacity-90"
      >
        Create workspace →
      </button>
    </form>
  );
}
