"use client";

import { useState, useTransition } from "react";
import { haptic } from "@/lib/haptics";

export type DeleteCategoryOption = { key: string; label: string; count: number };

export function DeleteConfirm({
  action,
  description = "This will permanently delete the record and cannot be undone.",
  categories,
}: {
  action: (selectedCategories: string[]) => Promise<void>;
  description?: string;
  // When provided (non-empty), renders one checkbox per category so the
  // caller can choose to actually delete related records instead of just
  // unlinking them (the default, unchecked behavior -- ON DELETE SET NULL
  // already handles that with no extra work here). Absent entirely for
  // callers that have nothing selectable, which renders exactly as before.
  categories?: DeleteCategoryOption[];
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-[10px] border border-ud-danger/20 bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-danger transition-colors hover:bg-ud-danger-bg"
      >
        Delete record
      </button>
    );
  }

  return (
    <div className="rounded-[10px] border border-ud-danger/20 bg-ud-danger-bg p-4 [animation:modal-enter_160ms_cubic-bezier(0.16,1,0.3,1)_both]">
      <p className="text-sm font-semibold text-ud-ink">Are you sure?</p>
      <p className="mt-1 text-sm leading-6 text-ud-muted">{description}</p>
      {categories && categories.length > 0 && (
        <div className="mt-3 space-y-2 rounded-[9px] border border-ud-danger/15 bg-ud-surface p-3">
          <p className="text-xs font-semibold text-ud-muted">Also permanently delete:</p>
          {categories.map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-sm text-ud-ink">
              <input
                type="checkbox"
                checked={checked.has(c.key)}
                onChange={(e) => {
                  setChecked((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(c.key);
                    else next.delete(c.key);
                    return next;
                  });
                }}
              />
              {c.label}
            </label>
          ))}
          <p className="text-xs text-ud-faint">Left unchecked, these just lose their connection to this record — they aren&apos;t deleted.</p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted transition-colors hover:bg-ud-surface-sunk"
        >
          Cancel
        </button>
        <button
          type="button"
          onTouchStart={() => haptic("heavy")}
          onClick={() => {
            setDeleteError("");
            startTransition(async () => {
              try {
                await action(Array.from(checked));
              } catch (err) {
                setDeleteError(err instanceof Error ? err.message : "Delete failed. Please try again.");
              }
            });
          }}
          disabled={isPending}
          className="rounded-[10px] bg-ud-danger px-4 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && (
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isPending ? "Deleting..." : "Yes, delete"}
        </button>
      </div>
      {deleteError && (
        <p className="mt-3 text-sm text-ud-danger">{deleteError}</p>
      )}
    </div>
  );
}
