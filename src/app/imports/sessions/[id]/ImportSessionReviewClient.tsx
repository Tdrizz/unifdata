"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ImportRow = {
  id: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  normalized_data: Record<string, unknown>;
  action: string;
  status: string;
  target_table: string | null;
  target_id: string | null;
  match_confidence: number | null;
  duplicate_reason: string | null;
  validation_errors: string[];
};

type ImportSession = {
  id: string;
  source_type: string;
  source_name: string | null;
  file_name: string | null;
  record_type: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  error_rows: number;
  created_rows: number;
  updated_rows: number;
  skipped_rows: number;
  error_message: string | null;
  created_at: string;
  committed_at: string | null;
};

export function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function getRowTone(status: string) {
  if (status === "valid" || status === "committed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "duplicate") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "skipped") {
    return "border-slate-200 bg-slate-50 text-slate-500";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getPrimaryRowLabel(
  recordType: string,
  normalizedData: Record<string, unknown>,
) {
  if (recordType === "relationships") {
    return displayValue(normalizedData.name);
  }

  if (recordType === "opportunities") {
    return displayValue(normalizedData.service_requested);
  }

  if (recordType === "work") {
    return displayValue(normalizedData.service_type);
  }

  if (recordType === "revenue") {
    const amount = displayValue(normalizedData.amount);
    const serviceType = displayValue(normalizedData.service_type);

    return serviceType !== "—" ? `${serviceType} · $${amount}` : `$${amount}`;
  }

  if (recordType === "actions") {
    return displayValue(normalizedData.message);
  }

  return "Imported row";
}

function getSecondaryRowLabel(
  recordType: string,
  normalizedData: Record<string, unknown>,
) {
  if (recordType === "relationships") {
    const email = displayValue(normalizedData.email);
    const phone = displayValue(normalizedData.phone);
    const address = displayValue(normalizedData.address);

    return [email, phone, address].filter((value) => value !== "—").join(" · ");
  }

  if (recordType === "opportunities") {
    return `${displayValue(normalizedData.status)} · ${displayValue(
      normalizedData.source,
    )}`;
  }

  if (recordType === "work") {
    return `${displayValue(normalizedData.status)} · ${displayValue(
      normalizedData.paid_status,
    )}`;
  }

  if (recordType === "revenue") {
    return `${displayValue(normalizedData.payment_status)} · ${displayValue(
      normalizedData.sale_date,
    )}`;
  }

  if (recordType === "actions") {
    return `${displayValue(normalizedData.status)} · due ${displayValue(
      normalizedData.due_date,
    )}`;
  }

  return "";
}

export function ImportSessionReviewClient({
  session,
  rows,
}: {
  session: ImportSession;
  rows: ImportRow[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [workingRowId, setWorkingRowId] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);

  const canCommit =
    session.status !== "committed" && Number(session.valid_rows || 0) > 0;

  const hasRowsButNothingReady =
    session.status !== "committed" &&
    Number(session.valid_rows || 0) === 0 &&
    (Number(session.duplicate_rows || 0) > 0 ||
      Number(session.error_rows || 0) > 0);

  async function updateRowAction(
    rowId: string,
    action: "skip" | "import_as_new" | "update_existing",
  ) {
    setMessage("");
    setWorkingRowId(rowId);

    try {
      const response = await fetch(
        `/api/import-sessions/${session.id}/rows/${rowId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to update row action.");
        return;
      }

      router.refresh();
    } catch {
      setMessage("Something went wrong while updating the row action.");
    } finally {
      setWorkingRowId(null);
    }
  }

  async function commitImport() {
    setMessage("");
    setCommitting(true);

    try {
      const response = await fetch(
        `/api/import-sessions/${session.id}/commit`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to commit import.");
        return;
      }

      setMessage(
        `Import committed. Created ${data.createdRows} records. Updated ${
          data.updatedRows || 0
        }. Skipped ${data.skippedRows}. Failed ${data.failedRows}.`,
      );

      router.refresh();
    } catch {
      setMessage("Something went wrong while committing the import.");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          {message}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Rows</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {session.total_rows}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-700">Ready</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">
            {session.valid_rows}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-700">Duplicates</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">
            {session.duplicate_rows}
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-700">Errors</p>
          <p className="mt-1 text-2xl font-semibold text-red-800">
            {session.error_rows}
          </p>
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-950">
          Fix issues before import
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Edit bad rows directly, resolve duplicates, then commit only the rows
          you want written into FrontierOps.
        </p>
      </div>

      {hasRowsButNothingReady && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          No new rows are ready to import. Resolve duplicate rows by skipping,
          importing as new, or updating the existing record. Error rows need to
          be fixed in the source file and uploaded again.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-950">Row review</p>
          <p className="mt-1 text-xs text-slate-500">
            Showing up to 250 staged rows.
          </p>
        </div>

        <div className="max-h-140 divide-y divide-slate-100 overflow-y-auto">
          {rows.map((row) => {
            const normalizedEntries = Object.entries(row.normalized_data);
            const isWorking = workingRowId === row.id;

            return (
              <article key={row.id} className="p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {getPrimaryRowLabel(
                        session.record_type,
                        row.normalized_data,
                      )}
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Row {row.row_number} ·{" "}
                      {getSecondaryRowLabel(
                        session.record_type,
                        row.normalized_data,
                      )}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {normalizedEntries.slice(0, 6).map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {key}: {displayValue(value)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getRowTone(
                      row.status,
                    )}`}
                  >
                    {row.status}
                  </span>
                </div>

                {row.duplicate_reason && (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-800">
                      {row.duplicate_reason}
                    </p>

                    {session.status !== "committed" &&
                      row.status === "duplicate" && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => updateRowAction(row.id, "skip")}
                            className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                          >
                            Skip
                          </button>

                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() =>
                              updateRowAction(row.id, "import_as_new")
                            }
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Import as new
                          </button>

                          {row.target_id && (
                            <button
                              type="button"
                              disabled={isWorking}
                              onClick={() =>
                                updateRowAction(row.id, "update_existing")
                              }
                              className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                              Update existing
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                )}

                {row.validation_errors?.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
                      Needs fix
                    </p>
                    <p className="mt-1 text-sm font-semibold text-red-800">
                      {row.validation_errors.join(" ")}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={commitImport}
        disabled={!canCommit || committing}
        className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {session.status === "committed"
          ? "Import already committed"
          : committing
            ? "Committing import..."
            : "Commit ready rows"}
      </button>
    </div>
  );
}
