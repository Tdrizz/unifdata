"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { removeSampleDataAction, updatePreferencesAction } from "@/features/settings/actions";

type Props = {
  hasRealCustomer: boolean;
  hasSampleData: boolean;
  hasTeammate: boolean;
};

// A short, non-linear nudge for the first few days, not a wizard — every
// item is independently actionable and the whole thing goes away for good
// the moment it's dismissed or fully done. See seedSampleDataIfEmptyAction
// (onboarding/actions.ts) for where the sample data this references comes
// from, and removeSampleDataAction (settings/actions.ts) for how it's
// cleared without touching anything the owner actually created.
export function OnboardingChecklist({ hasRealCustomer, hasSampleData, hasTeammate }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [removingSample, setRemovingSample] = useState(false);
  const [sampleRemoved, setSampleRemoved] = useState(false);
  const [, startTransition] = useTransition();

  const items = [
    { key: "customer", label: "Add your first customer", done: hasRealCustomer, href: "/customers#add-contact" },
    { key: "teammate", label: "Invite a teammate", done: hasTeammate, href: "/settings#team" },
    ...(hasSampleData && !sampleRemoved
      ? [{ key: "sample", label: "Remove the sample data", done: false, href: null }]
      : []),
  ];

  const allDone = items.every((i) => i.done);
  if (dismissed || allDone) return null;

  function handleDismiss() {
    setDismissed(true);
    startTransition(() => {
      updatePreferencesAction("onboarding_checklist_dismissed", true).catch(() => {
        // Non-fatal — worst case it reappears on the next visit.
      });
    });
  }

  async function handleRemoveSample() {
    setRemovingSample(true);
    try {
      await removeSampleDataAction();
      setSampleRemoved(true);
    } catch {
      // Leave the item in place so it can be retried.
    } finally {
      setRemovingSample(false);
    }
  }

  return (
    <div className="mb-6 rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-[18px] py-[14px] border-b border-ud-soft">
        <p className="text-[13.5px] font-semibold text-ud-ink">Getting set up</p>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[12px] font-medium text-ud-faint hover:text-ud-muted"
        >
          Dismiss
        </button>
      </div>
      <div className="px-[18px] py-[10px]">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2.5 py-[9px]">
            <span
              className={
                "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border text-[10px] " +
                (item.done ? "border-ud-accent bg-ud-accent text-white" : "border-ud text-transparent")
              }
            >
              ✓
            </span>
            {item.key === "sample" ? (
              <button
                type="button"
                onClick={handleRemoveSample}
                disabled={removingSample}
                className="text-[13px] font-medium text-ud-ink hover:text-ud-accent disabled:opacity-60"
              >
                {removingSample ? "Removing…" : item.label}
              </button>
            ) : item.done ? (
              <span className="text-[13px] font-medium text-ud-muted line-through">{item.label}</span>
            ) : (
              <Link href={item.href!} className="text-[13px] font-medium text-ud-ink hover:text-ud-accent">
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
