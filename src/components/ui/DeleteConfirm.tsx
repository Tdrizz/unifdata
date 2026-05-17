"use client";

import { useState, useTransition } from "react";

export function DeleteConfirm({
  action,
  description = "This will permanently delete the record and cannot be undone.",
}: {
  action: () => Promise<void>;
  description?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-[10px] border border-red-200 bg-ud-surface px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
      >
        Delete record
      </button>
    );
  }

  return (
    <div className="rounded-[10px] border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-ud-ink">Are you sure?</p>
      <p className="mt-1 text-sm leading-6 text-ud-muted">{description}</p>
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
          onClick={() => {
            setDeleteError("");
            startTransition(async () => {
              try {
                await action();
              } catch (err) {
                setDeleteError(err instanceof Error ? err.message : "Delete failed. Please try again.");
              }
            });
          }}
          disabled={isPending}
          className="rounded-[10px] bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && (
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isPending ? "Deleting..." : "Yes, delete"}
        </button>
      </div>
      {deleteError && (
        <p className="mt-3 text-sm text-red-700">{deleteError}</p>
      )}
    </div>
  );
}
