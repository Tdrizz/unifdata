"use client";

import { useState, useTransition } from "react";
import { updateLabelOverrideAction, resetLabelOverridesAction } from "../actions";

type DefaultLabels = {
  customerSingular: string;
  customerPlural: string;
  jobSingular: string;
  jobPlural: string;
  pipelineLabel: string;
  recordLabel: string;
  recordPlural: string;
  completedLabel: string;
  cancelledLabel: string;
  valueLabel: string;
  activeStatusLabel: string;
  inactiveStatusLabel: string;
};

type Props = {
  orgId: string;
  profileOverrides: Record<string, string>;
  defaultLabels: DefaultLabels;
};

const LABEL_KEYS: Array<{ key: keyof DefaultLabels; displayName: string }> = [
  { key: "customerSingular", displayName: "Customer (singular)" },
  { key: "customerPlural", displayName: "Customer (plural)" },
  { key: "jobSingular", displayName: "Job (singular)" },
  { key: "jobPlural", displayName: "Job (plural)" },
  { key: "pipelineLabel", displayName: "Pipeline label" },
  { key: "recordLabel", displayName: "Record (singular)" },
  { key: "recordPlural", displayName: "Record (plural)" },
  { key: "completedLabel", displayName: "Completed status" },
  { key: "cancelledLabel", displayName: "Cancelled status" },
  { key: "valueLabel", displayName: "Value label" },
  { key: "activeStatusLabel", displayName: "Active status" },
  { key: "inactiveStatusLabel", displayName: "Inactive status" },
];

const btnGhost = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms]";

export function LabelsSettings({ orgId, profileOverrides, defaultLabels }: Props) {
  const [overrides, setOverrides] = useState<Record<string, string>>(profileOverrides);
  const [inputValues, setInputValues] = useState<Record<string, string>>(
    Object.fromEntries(
      LABEL_KEYS.map(({ key }) => [key, profileOverrides[key] ?? defaultLabels[key]])
    )
  );
  const [, startTransition] = useTransition();

  function handleBlur(key: string, value: string) {
    const defaultVal = defaultLabels[key as keyof DefaultLabels];
    if (value === defaultVal) {
      if (overrides[key] !== undefined) {
        startTransition(async () => {
          await updateLabelOverrideAction(orgId, key, value);
          setOverrides((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        });
      }
      return;
    }
    if (value === overrides[key]) return;
    startTransition(async () => {
      await updateLabelOverrideAction(orgId, key, value);
      setOverrides((prev) => ({ ...prev, [key]: value }));
    });
  }

  function handleReset() {
    startTransition(async () => {
      await resetLabelOverridesAction(orgId);
      setOverrides({});
      setInputValues(
        Object.fromEntries(LABEL_KEYS.map(({ key }) => [key, defaultLabels[key]]))
      );
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-5">
        {LABEL_KEYS.map(({ key, displayName }) => {
          const isOverridden = overrides[key] !== undefined;
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-1">
                <label className="form-label mb-0">{displayName}</label>
                {!isOverridden && (
                  <span className="inline-flex items-center px-[6px] py-[1px] rounded-[4px] text-[10px] font-semibold bg-ud-surface border border-ud text-ud-faint">
                    default
                  </span>
                )}
              </div>
              <input
                className="form-input"
                value={inputValues[key] ?? ""}
                onChange={(e) => setInputValues((prev) => ({ ...prev, [key]: e.target.value }))}
                onBlur={(e) => handleBlur(key, e.target.value)}
              />
            </div>
          );
        })}
      </div>

      <button type="button" className={btnGhost} onClick={handleReset}>
        Reset to defaults
      </button>
    </div>
  );
}
