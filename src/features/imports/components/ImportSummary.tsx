"use client";

import Link from "next/link";
import { errorCsvDataUri } from "@/lib/imports/error-reporter";
import type { ImportError } from "@/lib/imports/error-reporter";

type Props = {
  sessionId?: string;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  recordType?: string;
  onImportAnother?: () => void;
};

function CountBadge({
  count,
  label,
  variant,
}: {
  count: number;
  label: string;
  variant: "success" | "warning" | "danger" | "neutral";
}) {
  const colors = {
    success: "bg-ud-success-bg text-ud-success",
    warning: "bg-ud-warning-bg text-ud-warning",
    danger: "bg-[#fef2f2] text-ud-danger",
    neutral: "bg-ud-surface-sunk text-ud-muted",
  };

  return (
    <div className="flex flex-col items-center gap-1 rounded-[10px] border border-ud bg-ud-surface px-4 py-3">
      <span
        className={`inline-flex items-center rounded-[6px] px-2.5 py-0.5 text-[13px] font-bold ${colors[variant]}`}
      >
        {count.toLocaleString()}
      </span>
      <span className="text-[11.5px] text-ud-muted">{label}</span>
    </div>
  );
}

export function ImportSummary({
  sessionId,
  created,
  updated,
  skipped,
  errors,
  recordType,
  onImportAnother,
}: Props) {
  const total = created + updated + skipped + errors.length;
  const hasErrors = errors.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[13.5px] font-semibold text-ud-ink">Import complete</p>
        <p className="mt-0.5 text-[12.5px] text-ud-muted">
          Processed {total.toLocaleString()} row{total !== 1 ? "s" : ""}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <CountBadge count={created} label="Created" variant="success" />
        <CountBadge count={updated} label="Updated" variant={updated > 0 ? "warning" : "neutral"} />
        <CountBadge count={skipped} label="Skipped" variant="neutral" />
        <CountBadge count={errors.length} label="Errors" variant={hasErrors ? "danger" : "neutral"} />
      </div>

      {hasErrors && (
        <div className="rounded-[10px] border border-[rgba(220,38,38,0.18)] bg-[#fef2f2] p-4">
          <p className="text-[12.5px] font-semibold text-ud-danger">
            {errors.length} row{errors.length !== 1 ? "s" : ""} could not be imported
          </p>

          <div className="mt-2 max-h-36 overflow-y-auto">
            {errors.slice(0, 10).map((e, i) => (
              <div key={i} className="mt-1 text-[12px] text-ud-danger">
                Row {e.row}
                {e.column ? ` · ${e.column}` : ""}: {e.message}
              </div>
            ))}
            {errors.length > 10 && (
              <p className="mt-1 text-[12px] text-ud-muted">
                …and {errors.length - 10} more
              </p>
            )}
          </div>

          <a
            href={errorCsvDataUri(errors)}
            download="import-errors.csv"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ud-danger underline underline-offset-2"
          >
            Download error report
          </a>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">
        {sessionId && (
          <Link
            href={`/imports/sessions/${sessionId}`}
            className="rounded-[10px] border border-ud bg-ud-surface px-4 py-2.5 text-[13px] font-semibold text-ud-muted hover:bg-ud-surface-sunk"
          >
            View session
          </Link>
        )}

        {recordType && (
          <Link
            href={
              recordType === "relationships"
                ? "/contacts"
                : recordType === "opportunities"
                  ? "/crm"
                  : recordType === "work"
                    ? "/jobs"
                    : recordType === "revenue"
                      ? "/sales"
                      : "/follow-ups"
            }
            className="rounded-[10px] bg-ud-ink px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
          >
            View imported records
          </Link>
        )}

        {onImportAnother && (
          <button
            type="button"
            onClick={onImportAnother}
            className="rounded-[10px] border border-ud bg-ud-surface px-4 py-2.5 text-[13px] font-semibold text-ud-muted hover:bg-ud-surface-sunk"
          >
            Import another file
          </button>
        )}
      </div>
    </div>
  );
}
