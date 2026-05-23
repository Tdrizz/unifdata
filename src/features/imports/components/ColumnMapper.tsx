"use client";

import { useState } from "react";
import type { ImportRecordType, ImportFieldDefinition } from "@/lib/import-engine-fields";
import { importFieldDefinitions } from "@/lib/import-engine-fields";
import type { ColumnMapping } from "@/lib/imports/fuzzy-mapper";

type Props = {
  headers: string[];
  mapping: ColumnMapping;
  recordType: ImportRecordType;
  onConfirm: (mapping: Record<string, string>) => void;
  onBack: () => void;
  busy?: boolean;
};

function ConfidencePip({ score }: { score: number }) {
  const color =
    score >= 0.85
      ? "bg-ud-success"
      : score >= 0.55
        ? "bg-ud-warning"
        : "bg-ud-danger";
  const label =
    score >= 0.85 ? "High confidence" : score >= 0.55 ? "Guessed" : "Low confidence";

  return (
    <span
      title={label}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`}
    />
  );
}

export function ColumnMapper({
  headers,
  mapping,
  recordType,
  onConfirm,
  onBack,
  busy = false,
}: Props) {
  const fields = importFieldDefinitions[recordType] as ImportFieldDefinition[];

  // UI state: fieldKey → selected column (or "" to skip)
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      init[f.key] = mapping[f.key]?.column ?? "";
    }
    return init;
  });

  function handleChange(fieldKey: string, column: string) {
    setSelections((prev) => ({ ...prev, [fieldKey]: column }));
  }

  function handleConfirm() {
    // Build { fieldKey: column } map, omitting empty / skipped
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(selections)) {
      if (v) result[k] = v;
    }
    onConfirm(result);
  }

  const requiredMissing = fields
    .filter((f) => f.required && !selections[f.key])
    .map((f) => f.label);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13.5px] font-semibold text-ud-ink">
          Review column mapping
        </p>
        <p className="mt-0.5 text-[12.5px] text-ud-muted">
          We matched your file&apos;s columns to UnifData fields. Adjust any
          that look wrong, then confirm.
        </p>
      </div>

      <div className="divide-y divide-[rgba(0,0,0,0.04)] rounded-[12px] border border-ud bg-ud-surface">
        {fields.map((field) => {
          const candidate = mapping[field.key];
          const selected = selections[field.key] ?? "";

          return (
            <div key={field.key} className="flex items-center gap-3 px-4 py-3">
              <div className="w-5/12 min-w-0">
                <p className="truncate text-[12.5px] font-semibold text-ud-ink">
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-ud-danger">*</span>
                  )}
                </p>
              </div>

              <div className="flex w-7/12 min-w-0 items-center gap-2">
                {candidate && selected === candidate.column && (
                  <ConfidencePip score={candidate.confidence} />
                )}

                <select
                  value={selected}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  disabled={busy}
                  className="min-w-0 flex-1 rounded-[8px] border border-ud bg-ud-surface px-3 py-1.5 text-[12.5px] text-ud-ink outline-none focus:border-ud-accent focus:ring-1 focus:ring-ud-accent/20 disabled:opacity-60"
                >
                  <option value="">Don&apos;t import</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {requiredMissing.length > 0 && (
        <p className="text-[12px] text-ud-danger">
          Required:{" "}
          <span className="font-semibold">{requiredMissing.join(", ")}</span>{" "}
          must be mapped before importing.
        </p>
      )}

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="rounded-[10px] border border-ud bg-ud-surface px-4 py-2.5 text-[13px] font-semibold text-ud-muted hover:bg-ud-surface-sunk disabled:opacity-60"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy || requiredMissing.length > 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-ud-ink px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy && (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {busy ? "Importing…" : "Confirm and import"}
        </button>
      </div>
    </div>
  );
}
