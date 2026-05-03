"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function GenerateSummaryButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function generateSummary() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/ai/business-summary", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to generate brief.");
        return;
      }

      setMessage("Brief generated and saved.");
      router.refresh();
    } catch {
      setMessage("Something went wrong while generating the brief.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="neutral">Gemini</StatusBadge>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Full workspace scan
            </p>
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
            Generate new brief
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            FrontierOps sends Gemini a compact view of your people,
            opportunities, work, revenue, and follow-ups, then saves the brief
            here.
          </p>
        </div>

        <button
          type="button"
          onClick={generateSummary}
          disabled={loading}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 md:min-w-40"
        >
          {loading ? "Generating..." : "Generate brief"}
        </button>
      </div>

      {message && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          {message}
        </div>
      )}
    </section>
  );
}
