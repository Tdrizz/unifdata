"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function GenerateSummaryButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "warning" | "error">(
    "info",
  );

  async function generateSummary() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/ai/business-summary", {
        method: "POST",
      });

      const data = await response.json();

      if (response.status === 429) {
        setMessageTone("warning");
        setMessage(data.error || "Please wait before generating another brief.");
        return;
      }

      if (response.status === 503) {
        setMessageTone("warning");
        setMessage(
          data.error ||
            "Gemini is under high demand right now. Wait a moment and try again.",
        );
        return;
      }

      if (!response.ok) {
        setMessageTone("error");
        setMessage(data.error || "Failed to generate brief.");
        return;
      }

      setMessageTone("info");
      setMessage("Brief generated and saved.");
      router.refresh();
    } catch {
      setMessageTone("error");
      setMessage("Something went wrong while generating the brief.");
    } finally {
      setLoading(false);
    }
  }

  const messageClass =
    messageTone === "warning"
      ? "mt-5 rounded-[10px] border border-ud-warning/20 bg-ud-warning-bg p-4 text-sm font-medium text-ud-warning"
      : messageTone === "error"
        ? "mt-5 rounded-[10px] border border-ud-danger/20 bg-ud-danger-bg p-4 text-sm font-medium text-ud-danger"
        : "mt-5 rounded-[10px] border border-ud bg-ud-surface-sunk p-4 text-sm font-semibold text-ud-muted";

  return (
    <section className="rounded-[14px] border border-ud bg-ud-surface p-6 shadow-ud">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="neutral">Gemini</StatusBadge>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ud-faint">
              Full workspace scan
            </p>
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ud-ink">
            Generate new brief
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-ud-muted">
            UnifData sends Gemini a compact view of your workspace data, then
            saves the operating brief here. One brief per 10 minutes.
          </p>
        </div>

        <button
          type="button"
          onClick={generateSummary}
          disabled={loading}
          className="rounded-[10px] bg-ud-accent px-5 py-3 text-sm font-semibold text-white shadow-ud hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-60 md:min-w-40"
        >
          {loading ? "Generating..." : "Generate brief"}
        </button>
      </div>

      {message && <div className={messageClass}>{message}</div>}
    </section>
  );
}
