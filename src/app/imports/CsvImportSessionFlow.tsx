"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RecordType =
  | "relationships"
  | "opportunities"
  | "work"
  | "revenue"
  | "actions";

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
  created_at: string;
  committed_at: string | null;
};

type SessionPreview = {
  session: ImportSession;
  rows: ImportRow[];
};

const recordTypes: {
  value: RecordType;
  label: string;
  description: string;
}[] = [
  {
    value: "relationships",
    label: "Relationships",
    description:
      "People, clients, customers, patients, companies, or accounts.",
  },
  {
    value: "opportunities",
    label: "Opportunities",
    description:
      "Quotes, inquiries, proposals, treatment plans, policies, or deals.",
  },
  {
    value: "work",
    label: "Work",
    description:
      "Jobs, appointments, projects, service visits, orders, or tasks.",
  },
  {
    value: "revenue",
    label: "Revenue",
    description:
      "Payments, invoices, collections, commissions, sales, or balances.",
  },
  {
    value: "actions",
    label: "Actions",
    description: "Follow-ups, reminders, callbacks, renewals, or next steps.",
  },
];

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

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

export function CsvImportSessionFlow() {
  const router = useRouter();

  const [recordType, setRecordType] = useState<RecordType>("relationships");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SessionPreview | null>(null);
  const [message, setMessage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);

  async function analyzeCsv() {
    setMessage("");
    setPreview(null);

    if (!file) {
      setMessage("Choose a CSV file first.");
      return;
    }

    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("recordType", recordType);
      formData.append("csvFile", file);

      const response = await fetch("/api/import-sessions/csv", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to analyze CSV.");
        return;
      }

      const previewResponse = await fetch(
        `/api/import-sessions/${data.session_id}`,
      );
      const previewData = await previewResponse.json();

      if (!previewResponse.ok) {
        setMessage(previewData.error || "Failed to load import preview.");
        return;
      }

      setPreview({
        session: previewData.session,
        rows: previewData.rows || [],
      });

      setMessage("CSV analyzed. Review the preview before committing.");
    } catch {
      setMessage("Something went wrong while analyzing the CSV.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function updateRowAction(
    rowId: string,
    action: "skip" | "import_as_new" | "update_existing",
  ) {
    if (!preview?.session.id) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch(
        `/api/import-sessions/${preview.session.id}/rows/${rowId}`,
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

      const previewResponse = await fetch(
        `/api/import-sessions/${preview.session.id}`,
      );
      const previewData = await previewResponse.json();

      if (previewResponse.ok) {
        setPreview({
          session: previewData.session,
          rows: previewData.rows || [],
        });
      }
    } catch {
      setMessage("Something went wrong while updating the row action.");
    }
  }

  async function commitImport() {
    if (!preview?.session.id) {
      return;
    }

    setMessage("");
    setCommitting(true);

    try {
      const response = await fetch(
        `/api/import-sessions/${preview.session.id}/commit`,
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
        `Import committed. Created ${data.createdRows} records. Skipped ${data.skippedRows}. Failed ${data.failedRows}.`,
      );

      const previewResponse = await fetch(
        `/api/import-sessions/${preview.session.id}`,
      );
      const previewData = await previewResponse.json();

      if (previewResponse.ok) {
        setPreview({
          session: previewData.session,
          rows: previewData.rows || [],
        });
      }

      router.refresh();
    } catch {
      setMessage("Something went wrong while committing the import.");
    } finally {
      setCommitting(false);
    }
  }

  const selectedType = recordTypes.find((type) => type.value === recordType);
  const canCommit =
    Boolean(preview) &&
    preview?.session.status !== "committed" &&
    Number(preview?.session.valid_rows || 0) > 0;
  const hasRowsButNothingReady =
    Boolean(preview) &&
    preview?.session.status !== "committed" &&
    Number(preview?.session.valid_rows || 0) === 0 &&
    (Number(preview?.session.duplicate_rows || 0) > 0 ||
      Number(preview?.session.error_rows || 0) > 0);

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium text-slate-700">
          What type of data is this?
        </label>

        <select
          value={recordType}
          onChange={(event) => {
            setRecordType(event.target.value as RecordType);
            setPreview(null);
            setMessage("");
          }}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
        >
          {recordTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          {selectedType?.description}
        </p>
      </div>

      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <label className="text-sm font-medium text-slate-700">CSV file</label>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setPreview(null);
            setMessage("");
          }}
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
        />

        {file && (
          <p className="mt-3 text-sm font-medium text-slate-700">
            Selected: {file.name}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={analyzeCsv}
        disabled={!file || analyzing}
        className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {analyzing ? "Analyzing CSV..." : "Analyze CSV"}
      </button>

      {message && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          {message}
        </div>
      )}

      {preview && (
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5">
          <div>
            <p className="text-lg font-semibold text-slate-950">
              Import preview
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {preview.session.file_name || "CSV import"} ·{" "}
              {preview.session.record_type}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Rows</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {preview.session.total_rows}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-medium text-emerald-700">Ready</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-800">
                {preview.session.valid_rows}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium text-amber-700">Duplicates</p>
              <p className="mt-1 text-2xl font-semibold text-amber-800">
                {preview.session.duplicate_rows}
              </p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-medium text-red-700">Errors</p>
              <p className="mt-1 text-2xl font-semibold text-red-800">
                {preview.session.error_rows}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">
              What happens when you commit?
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ready rows will be created in FrontierOps. Duplicate and error
              rows will be skipped for now so the import does not create messy
              records.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">Row review</p>
              <p className="mt-1 text-xs text-slate-500">
                Showing up to 100 staged rows.
              </p>
            </div>

            <div className="max-h-105 divide-y divide-slate-100 overflow-y-auto">
              {preview.rows.map((row) => {
                const normalizedEntries = Object.entries(row.normalized_data);

                return (
                  <article key={row.id} className="p-4">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          Row {row.row_number}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {normalizedEntries.slice(0, 5).map(([key, value]) => (
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
                        className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getRowTone(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </div>

                    {row.duplicate_reason && (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-xs font-semibold text-amber-800">
                          {row.duplicate_reason}
                        </p>

                        {preview.session.status !== "committed" &&
                          row.status === "duplicate" && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => updateRowAction(row.id, "skip")}
                                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                              >
                                Skip
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateRowAction(row.id, "import_as_new")
                                }
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Import as new
                              </button>

                              {row.target_id && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateRowAction(row.id, "update_existing")
                                  }
                                  className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                  Update existing
                                </button>
                              )}
                            </div>
                          )}
                      </div>
                    )}

                    {row.validation_errors?.length > 0 && (
                      <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                        {row.validation_errors.join(" ")}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>

          {hasRowsButNothingReady && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              No new rows are ready to import. Resolve duplicate rows by
              skipping, importing as new, or updating the existing record. Error
              rows need to be fixed in the source file and uploaded again.
            </div>
          )}

          <button
            type="button"
            onClick={commitImport}
            disabled={!canCommit || committing}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {preview.session.status === "committed"
              ? "Import already committed"
              : committing
                ? "Committing import..."
                : "Commit ready rows"}
          </button>
        </div>
      )}
    </div>
  );
}
