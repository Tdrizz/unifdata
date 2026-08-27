"use client";

import { useState, useTransition } from "react";
import { setLeadStatusAction, setJobStatusAction } from "../actions";
import type { PipelineCard } from "../types";

// Simple, fixed action sets per stage -- the direct fix for "the logic seems
// like it doesn't work and is all over the place": instead of retyping a
// freeform status into an edit form, each stage offers only the few moves
// that actually make sense from there. Paid is terminal (no actions).
const LEAD_STAGE_ACTIONS: Record<string, { label: string; status: string }[]> = {
  Lead: [
    { label: "New", status: "New" },
    { label: "Contacted", status: "Contacted" },
    { label: "Estimate sent", status: "Estimate Sent" },
    { label: "Won", status: "Won" },
    { label: "Lost", status: "Lost" },
  ],
  Quoted: [
    { label: "Won", status: "Won" },
    { label: "Lost", status: "Lost" },
  ],
};

export function PipelineCardActions({ card }: { card: PipelineCard }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  };

  let buttons: { label: string; onClick: () => void }[] = [];

  if (card.sourceType === "lead" && (card.stage === "Lead" || card.stage === "Quoted")) {
    buttons = (LEAD_STAGE_ACTIONS[card.stage] ?? []).map((action) => ({
      label: action.label,
      onClick: () => run(() => setLeadStatusAction(card.sourceId, action.status)),
    }));
  } else if (card.sourceType === "job" && card.stage === "Active") {
    buttons = [
      { label: "Complete", onClick: () => run(() => setJobStatusAction(card.sourceId, "Completed")) },
      { label: "Cancel", onClick: () => run(() => setJobStatusAction(card.sourceId, "Cancelled")) },
    ];
  } else if (card.sourceType === "job" && card.stage === "Complete") {
    buttons = [
      { label: "Mark paid", onClick: () => run(() => setJobStatusAction(card.sourceId, "Completed", "Paid")) },
    ];
  }

  if (buttons.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {buttons.map((button) => (
        <button
          key={button.label}
          type="button"
          disabled={isPending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            button.onClick();
          }}
          className="rounded-[7px] border border-ud bg-ud-surface px-2 py-1 text-[11px] font-semibold text-ud-muted transition-colors duration-[120ms] hover:bg-ud-surface-sunk hover:text-ud-ink active:bg-ud-surface-sunk disabled:opacity-50 disabled:pointer-events-none"
        >
          {button.label}
        </button>
      ))}
      {error && <p className="w-full text-[11px] text-ud-danger">{error}</p>}
    </div>
  );
}
