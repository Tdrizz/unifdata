"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LinkageSuggestion } from "@/lib/import-engine";

export type ImportRow = {
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

type ReviewFieldDefinition = {
  key: string;
  label: string;
  type?: "text" | "number" | "date";
};

const reviewFieldDefinitions: Record<string, ReviewFieldDefinition[]> = {
  relationships: [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address" },
    { key: "customer_type", label: "Type" },
    { key: "notes", label: "Notes" },
  ],
  opportunities: [
    { key: "service_requested", label: "Opportunity name" },
    { key: "status", label: "Status" },
    { key: "estimated_value", label: "Estimated value", type: "number" },
    { key: "source", label: "Source" },
    { key: "next_follow_up_date", label: "Next follow-up date", type: "date" },
    { key: "notes", label: "Notes" },
  ],
  work: [
    { key: "service_type", label: "Work name" },
    { key: "status", label: "Status" },
    { key: "job_value", label: "Work value", type: "number" },
    { key: "start_date", label: "Start date", type: "date" },
    { key: "completed_date", label: "Completed date", type: "date" },
    { key: "paid_status", label: "Payment status" },
    { key: "notes", label: "Notes" },
  ],
  revenue: [
    { key: "amount", label: "Amount", type: "number" },
    { key: "payment_status", label: "Payment status" },
    { key: "sale_date", label: "Revenue date", type: "date" },
    { key: "service_type", label: "Service / category" },
    { key: "source", label: "Source" },
  ],
  actions: [
    { key: "message", label: "Action" },
    { key: "due_date", label: "Due date", type: "date" },
    { key: "status", label: "Status" },
  ],
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
    return "border-slate-200 bg-slate-50 text-ud-muted";
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
  const [cancelling, setCancelling] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<Record<string, string>>({});
  const [linkageSuggestions, setLinkageSuggestions] = useState<LinkageSuggestion[]>([]);
  const [applyingLinks, setApplyingLinks] = useState(false);
  const [skippedSuggestions, setSkippedSuggestions] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);

  const canCommit =
    session.status !== "committed" &&
    session.status !== "cancelled" &&
    Number(session.valid_rows || 0) > 0;
  const hasRowsButNothingReady =
    session.status !== "committed" &&
    session.status !== "cancelled" &&
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

  function startEditingRow(row: ImportRow) {
    const fields = reviewFieldDefinitions[session.record_type] || [];
    const draft: Record<string, string> = {};

    fields.forEach((field) => {
      const value = row.normalized_data[field.key];

      draft[field.key] =
        value === null || value === undefined || value === ""
          ? ""
          : String(value);
    });

    setEditingRowId(row.id);
    setRowDraft(draft);
    setMessage("");
  }

  async function saveRowEdit(rowId: string) {
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
          body: JSON.stringify({
            normalizedData: rowDraft,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to save row changes.");
        return;
      }

      setEditingRowId(null);
      setRowDraft({});
      router.refresh();
    } catch {
      setMessage("Something went wrong while saving row changes.");
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

      const parts = [`Created ${data.createdRows} records.`];
      if (data.updatedRows) parts.push(`Updated ${data.updatedRows}.`);
      if (data.skippedRows) parts.push(`Skipped ${data.skippedRows}.`);
      if (data.failedRows) parts.push(`Failed ${data.failedRows}.`);
      setMessage(`Import committed. ${parts.join(" ")}`);

      if (Array.isArray(data.linkageSuggestions) && data.linkageSuggestions.length > 0) {
        setLinkageSuggestions(data.linkageSuggestions);
      }

      router.refresh();
    } catch {
      setMessage("Something went wrong while committing the import.");
    } finally {
      setCommitting(false);
    }
  }

  async function cancelImport() {
    const confirmed = window.confirm(
      "Cancel this import review? No records will be committed.",
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setCancelling(true);

    try {
      const response = await fetch(`/api/import-sessions/${session.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "cancel" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to cancel import.");
        return;
      }

      router.push("/imports");
    } catch {
      setMessage("Something went wrong while cancelling the import.");
    } finally {
      setCancelling(false);
    }
  }

  async function bulkAction(
    action: "skip" | "update_existing",
    filter: "duplicates" | "errors",
  ) {
    setMessage("");
    setBulkWorking(true);

    try {
      const response = await fetch(
        `/api/import-sessions/${session.id}/rows/bulk`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, filter }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to apply bulk action.");
        return;
      }

      router.refresh();
    } catch {
      setMessage("Something went wrong while applying the bulk action.");
    } finally {
      setBulkWorking(false);
    }
  }

  const activeSuggestions = linkageSuggestions.filter(
    (s) => !skippedSuggestions.has(s.record_id),
  );

  async function applyAllLinkSuggestions() {
    setApplyingLinks(true);
    setMessage("");

    try {
      const suggestions = activeSuggestions.map((s) => ({
        table: s.table,
        record_id: s.record_id,
        field: s.field,
        value: s.suggested_id,
      }));

      const response = await fetch("/api/link-suggestions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to apply links.");
        return;
      }

      setMessage(`Linked ${data.appliedCount} records.`);
      setLinkageSuggestions([]);
      router.refresh();
    } catch {
      setMessage("Something went wrong while applying links.");
    } finally {
      setApplyingLinks(false);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="flex items-start justify-between gap-3 rounded-[12px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-ud-muted">{message}</p>
          <button
            type="button"
            onClick={() => setMessage("")}
            className="shrink-0 text-ud-faint hover:text-slate-600"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-ud-muted">Rows</p>
          <p className="mt-1 text-2xl font-semibold text-ud-ink">
            {session.total_rows}
          </p>
        </div>

        <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-700">Ready</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">
            {session.valid_rows}
          </p>
        </div>

        <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-700">Duplicates</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">
            {session.duplicate_rows}
          </p>
        </div>

        <div className="rounded-[12px] border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-700">Errors</p>
          <p className="mt-1 text-2xl font-semibold text-red-800">
            {session.error_rows}
          </p>
        </div>
      </section>

      <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-ud-ink">
          Fix issues before import
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Edit bad rows directly, resolve duplicates, then commit only the rows
          you want written into UnifData.
        </p>
      </div>

      {hasRowsButNothingReady && (
        <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          No new rows are ready to import. Resolve duplicate rows by skipping,
          importing as new, or updating the existing record. Error rows need to
          be fixed in the source file and uploaded again.
        </div>
      )}

      {session.status !== "committed" &&
        session.status !== "cancelled" &&
        Number(session.duplicate_rows || 0) >= 3 && (
          <div className="flex items-center justify-between gap-3 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              {session.duplicate_rows} duplicate rows detected
            </p>
            <button
              type="button"
              disabled={bulkWorking}
              onClick={() => bulkAction("skip", "duplicates")}
              className="shrink-0 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
            >
              {bulkWorking ? "Skipping..." : "Skip all duplicates"}
            </button>
          </div>
        )}

      <div className="overflow-hidden rounded-[12px] border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-ud-ink">Row review</p>
          <p className="mt-1 text-xs text-ud-muted">
            Showing up to 250 staged rows.
          </p>
        </div>

        <div className="max-h-140 divide-y divide-slate-100 overflow-y-auto">
          {rows.map((row) => {
            const normalizedEntries = Object.entries(row.normalized_data);
            const isWorking = workingRowId === row.id;
            const isEditing = editingRowId === row.id;
            const editableFields =
              reviewFieldDefinitions[session.record_type] || [];

            return (
              <article key={row.id} className="p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-sm font-semibold text-ud-ink">
                      {getPrimaryRowLabel(
                        session.record_type,
                        row.normalized_data,
                      )}
                    </p>

                    <p className="mt-1 text-xs font-medium text-ud-muted">
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

                  {isEditing && (
                    <div className="mt-4 rounded-[12px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-ud-ink">
                        Edit staged row
                      </p>
                      <p className="mt-1 text-xs text-ud-muted">
                        These changes only affect this import review until you
                        commit.
                      </p>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {editableFields.map((field) => (
                          <label
                            key={field.key}
                            className="text-sm font-medium text-ud-muted"
                          >
                            {field.label}
                            <input
                              type={
                                field.type === "number"
                                  ? "number"
                                  : field.type === "date"
                                    ? "date"
                                    : "text"
                              }
                              value={rowDraft[field.key] || ""}
                              onChange={(event) =>
                                setRowDraft((current) => ({
                                  ...current,
                                  [field.key]: event.target.value,
                                }))
                              }
                              className="mt-2 w-full rounded-[12px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/20 focus:border-ud-accent"
                            />
                          </label>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => saveRowEdit(row.id)}
                          className="rounded-xl bg-ud-ink px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                        >
                          Save row changes
                        </button>

                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => {
                            setEditingRowId(null);
                            setRowDraft({});
                          }}
                          className="rounded-xl border border-ud bg-ud-surface px-4 py-2 text-xs font-semibold text-ud-muted hover:bg-slate-50 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getRowTone(
                        row.status,
                      )}`}
                    >
                      {row.status}
                    </span>

                    {session.status !== "committed" &&
                      session.status !== "cancelled" && (
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() =>
                            isEditing
                              ? setEditingRowId(null)
                              : startEditingRow(row)
                          }
                          className="rounded-xl border border-ud bg-ud-surface px-3 py-1.5 text-xs font-semibold text-ud-muted hover:bg-slate-50 disabled:opacity-60"
                        >
                          {isEditing ? "Cancel edit" : "Edit row"}
                        </button>
                      )}
                  </div>
                </div>

                {!!row.normalized_data._customer_unlinked && (
                  <div className="mt-3 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-800">
                      Customer not matched
                    </p>
                    <p className="mt-1 text-sm text-amber-700">
                      No customer named &ldquo;{String(row.normalized_data.customer_name ?? "")}&rdquo; was found. This record will import without a customer link.
                    </p>
                    <p className="mt-1.5 text-xs text-amber-600">
                      Edit the row to fix the name, or import anyway and link the customer later.
                    </p>
                  </div>
                )}

                {!!row.normalized_data._date_defaulted && (
                  <div className="mt-3 rounded-[12px] border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-700">
                      Date defaulted to today
                    </p>
                    <p className="mt-1 text-xs text-amber-600">
                      No date was found in this row. If this is a historical record, edit the row to set the correct date.
                    </p>
                  </div>
                )}

                {row.duplicate_reason && (
                  <div className="mt-3 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-800">
                      {row.duplicate_reason}
                    </p>

                    {session.status !== "committed" &&
                      session.status !== "cancelled" &&
                      row.status === "duplicate" && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => updateRowAction(row.id, "skip")}
                            className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                          >
                            Skip this row
                          </button>

                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() =>
                              updateRowAction(row.id, "import_as_new")
                            }
                            className="rounded-xl border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-slate-50 disabled:opacity-60"
                          >
                            Import as separate record
                          </button>

                          {row.target_id && (
                            <button
                              type="button"
                              disabled={isWorking}
                              onClick={() =>
                                updateRowAction(row.id, "update_existing")
                              }
                              className="rounded-xl bg-ud-ink px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                            >
                              Update matched record
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                )}

                {row.validation_errors?.length > 0 && (
                  <div className="mt-3 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
                      Needs fix
                    </p>
                    <p className="mt-1 text-sm font-semibold text-red-800">
                      {row.validation_errors.join(" ")}
                    </p>
                    {session.status !== "committed" &&
                      session.status !== "cancelled" &&
                      row.status === "error" && (
                        <div className="mt-3">
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => updateRowAction(row.id, "skip")}
                            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
                          >
                            Skip this row
                          </button>
                        </div>
                      )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {activeSuggestions.length > 0 && (
        <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Link related records
              </p>
              <p className="mt-1 text-sm text-slate-600">
                We found {activeSuggestions.length} record{activeSuggestions.length !== 1 ? "s" : ""} that can be automatically linked based on matching customers and similar data.
              </p>
            </div>

            <button
              type="button"
              disabled={applyingLinks}
              onClick={applyAllLinkSuggestions}
              className="shrink-0 rounded-xl bg-ud-ink px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {applyingLinks ? "Linking..." : `Apply all ${activeSuggestions.length}`}
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {activeSuggestions.map((suggestion) => (
              <div key={suggestion.record_id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {suggestion.record_label}
                  </p>
                  <p className="mt-0.5 text-xs text-[#4A3FA8] font-medium">
                    {suggestion.table === "jobs" ? "Job" : "Sale"} → {suggestion.suggested_label}
                    {suggestion.customer_name ? ` · ${suggestion.customer_name}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-ud-muted">{suggestion.reason}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${suggestion.confidence >= 0.7 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                    {Math.round(suggestion.confidence * 100)}% match
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setSkippedSuggestions((prev) => {
                        const next = new Set(prev);
                        next.add(suggestion.record_id);
                        return next;
                      })
                    }
                    className="text-xs text-ud-faint hover:text-slate-600"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
        {session.status !== "committed" && session.status !== "cancelled" && (
          <button
            type="button"
            onClick={cancelImport}
            disabled={cancelling || committing}
            className="rounded-[12px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelling ? "Cancelling..." : "Cancel import"}
          </button>
        )}

        <button
          type="button"
          onClick={commitImport}
          disabled={!canCommit || committing || cancelling}
          className="rounded-[12px] bg-ud-ink px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:min-w-55"
        >
          {session.status === "committed"
            ? "Import already committed"
            : session.status === "cancelled"
              ? "Import cancelled"
              : committing
                ? "Committing import..."
                : "Commit ready rows"}
        </button>
      </div>
    </div>
  );
}
