"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { updateMonthlyGoalAction } from "../actions";

interface Props {
  currentGoal?: number;
  currentMonthRevenue?: number;
}

const btnInk = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-ink text-white hover:opacity-85 transition-opacity duration-[120ms] disabled:opacity-40";

export function MonthlyGoalForm({ currentGoal, currentMonthRevenue }: Props) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const progressPct = currentGoal && currentGoal > 0 && currentMonthRevenue !== undefined
    ? Math.min(Math.round((currentMonthRevenue / currentGoal) * 100), 100)
    : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rawValue = inputRef.current?.value ?? "";
    const goal = parseFloat(rawValue.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(goal) || goal < 0) {
      setError("Enter a valid dollar amount.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateMonthlyGoalAction(goal);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-end gap-3 mb-3">
        <div className="flex-1">
          <label className="form-label">Monthly revenue goal ($)</label>
          <input
            ref={inputRef}
            type="number"
            min="0"
            step="100"
            defaultValue={currentGoal ?? ""}
            placeholder="e.g. 10000"
            className="form-input"
          />
        </div>
        <div className="flex gap-2 pb-0.5">
          <Button type="reset" variant="secondary" size="md">Clear</Button>
          <button type="submit" disabled={isPending} className={btnInk}>
            {isPending ? "Saving…" : saved ? "Saved ✓" : "Save goal"}
          </button>
        </div>
      </div>

      {progressPct !== null && (
        <div className="mb-2">
          <div className="flex justify-between text-[11.5px] text-ud-muted mb-1">
            <span>This month: ${currentMonthRevenue?.toLocaleString() ?? 0}</span>
            <span>{progressPct}% of goal</span>
          </div>
          <div className="h-1.5 rounded-full bg-ud-surface border border-[rgba(0,0,0,0.06)] overflow-hidden">
            <div
              className="h-full rounded-full bg-ud-accent transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
    </form>
  );
}
