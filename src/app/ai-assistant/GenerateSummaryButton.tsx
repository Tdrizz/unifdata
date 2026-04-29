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
    setMessage("AI summary generated and saved.");
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Generate business summary</h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        FrontierOps will read your current customers, leads, jobs, sales, and
        follow-ups, then generate a plain-English business summary.
      </p>

      <button
        onClick={generateSummary}
        disabled={loading}
        className="mt-5 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Generating..." : "Generate AI summary"}
      </button>

      {message && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
          {message}
        </div>
      )}

      {summary && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
          <h3 className="font-bold">Latest generated summary</h3>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7">
            {summary}
          </div>
        </div>
      )}
    </div>
  );
}
