"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateSummaryButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState("");

  async function generateSummary() {
    setLoading(true);
    setMessage("");
    setSummary("");

    const response = await fetch("/api/ai/business-summary", {
      method: "POST",
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.error || "Failed to generate summary.");
      return;
    }

    setSummary(data.summary || "");
    setMessage("Summary generated and saved.");
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
        Generate
      </p>

      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
        Create a business report
      </h2>

      <p className="mt-3 text-sm leading-7 text-slate-600">
        Pull current operating metrics and generate a short summary with
        recommended next actions.
      </p>

      <button
        onClick={generateSummary}
        disabled={loading}
        className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Generating summary..." : "Generate AI summary"}
      </button>

      {message && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
          {message}
        </div>
      )}

      {summary && (
        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="font-black text-slate-950">Latest summary</p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {summary}
          </div>
        </div>
      )}
    </div>
  );
}
