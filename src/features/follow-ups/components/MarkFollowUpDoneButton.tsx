"use client";

import { useState, useTransition } from "react";
import { markFollowUpCompleteAction } from "../actions";

// Small, reusable escape hatch dropped into whatever's already rendering a
// follow-up (pipeline card, dashboard queue row, contact records tab) — see
// PipelineCardActions.tsx for the same "sibling of the Link, not nested
// inside it" placement this relies on to stay clickable without triggering
// the row's own navigation.
export function MarkFollowUpDoneButton({ id, className }: { id: string; className?: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) return null;

  return (
    <div className={className}>
      <button
        type="button"
        disabled={isPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError(null);
          startTransition(async () => {
            try {
              await markFollowUpCompleteAction(id);
              setDone(true);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to update.");
            }
          });
        }}
        className="rounded-[7px] border border-ud bg-ud-surface px-2 py-1 text-[11px] font-semibold text-ud-muted transition-colors duration-[120ms] hover:bg-ud-surface-sunk hover:text-ud-ink active:bg-ud-surface-sunk disabled:opacity-50 disabled:pointer-events-none"
      >
        {isPending ? "Marking done…" : "Mark done"}
      </button>
      {error && <p className="mt-1 text-[11px] text-ud-danger">{error}</p>}
    </div>
  );
}
