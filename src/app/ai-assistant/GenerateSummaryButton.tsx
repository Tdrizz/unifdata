"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function GenerateSummaryButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState("");

  async function generateSummary() {
    setLoading(true);
    setMessage("");
    setSummary("");

    try {
      const response = await fetch("/api/ai/business-summary", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to generate summary.");
        return;
      }

      setSummary(data.summary || "");
      setMessage("Summary generated and saved.");
      router.refresh();
    } catch {
      setMessage("Something went wrong while generating the summary.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Advisor
          </p>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Generate business brief
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-600">
            FrontierOps reviews current business activity and creates a short
            operating summary with risks, priorities, and next steps.
          </p>
        </div>

        <StatusBadge>AI</StatusBadge>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-semibold text-slate-950">
          Best used after adding:
        </p>

        <div className="mt-4 grid gap-3">
          {[
            "Customers or client records",
            "Open opportunities, estimates, or inquiries",
            "Work, jobs, appointments, or projects",
            "Revenue and payment records",
            "Follow-ups and reminders",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={generateSummary}
        disabled={loading}
        className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Generating brief..." : "Generate AI brief"}
      </button>

      {message && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          {message}
        </div>
      )}

      {summary && (
        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="font-semibold text-slate-950">Generated brief</p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {summary}
          </div>
        </div>
      )}
    </section>
  );
}
