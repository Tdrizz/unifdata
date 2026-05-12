"use client";

import { useState } from "react";

export function DeleteConfirm({
  action,
  description = "This will permanently delete the record and cannot be undone.",
}: {
  action: () => Promise<void>;
  description?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
      >
        Delete record
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-slate-950">Are you sure?</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <form action={action}>
          <button
            type="submit"
            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Yes, delete
          </button>
        </form>
      </div>
    </div>
  );
}
