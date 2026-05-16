"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { importFieldDefinitions } from "@/lib/import-engine";

type RecordType =
  | "relationships"
  | "opportunities"
  | "work"
  | "revenue"
  | "actions";

type Step = "upload" | "mapping";

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

function getFieldOptions(recordType: string) {
  return (
    importFieldDefinitions[recordType as keyof typeof importFieldDefinitions] ??
    []
  );
}

export function CsvImportSessionFlow() {
  const router = useRouter();

  const [recordType, setRecordType] = useState<RecordType>("relationships");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const [step, setStep] = useState<Step>("upload");
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  // headerToField maps column header → field key (for UI dropdowns)
  const [headerToField, setHeaderToField] = useState<Record<string, string>>(
    {},
  );

  async function analyzeCsv() {
    setMessage("");

    if (!file) {
      setMessage("Choose a CSV or Excel file first.");
      return;
    }

    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("recordType", recordType);
      formData.append("csvFile", file);

      const response = await fetch("/api/import-sessions/csv?analyze=1", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to analyze file.");
        return;
      }

      const headers: string[] = data.headers ?? [];
      // API mapping is { fieldKey: "Column Header" } — invert for UI
      const apiMapping: Record<string, string> = data.mapping ?? {};
      const inverted: Record<string, string> = {};
      for (const [fieldKey, columnHeader] of Object.entries(apiMapping)) {
        inverted[columnHeader] = fieldKey;
      }

      setDetectedHeaders(headers);
      setHeaderToField(inverted);
      setStep("mapping");
    } catch {
      setMessage("Something went wrong while analyzing the CSV.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function confirmAndCreate() {
    setAnalyzing(true);

    try {
      // Re-invert headerToField back to { fieldKey: "Column Header" }
      const mapping: Record<string, string> = {};
      for (const [columnHeader, fieldKey] of Object.entries(headerToField)) {
        if (fieldKey) {
          mapping[fieldKey] = columnHeader;
        }
      }

      const formData = new FormData();
      formData.append("recordType", recordType);
      formData.append("csvFile", file!);
      formData.append("mapping", JSON.stringify(mapping));

      const response = await fetch("/api/import-sessions/csv", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to create import.");
        return;
      }

      router.push(`/imports/sessions/${data.session_id}`);
    } catch {
      setMessage("Something went wrong while creating the import.");
    } finally {
      setAnalyzing(false);
    }
  }

  const selectedType = recordTypes.find((type) => type.value === recordType);

  return (
    <div className="space-y-5">
      {step === "upload" && (
        <>
          <div>
            <label className="text-sm font-medium text-ud-muted">
              What type of data is this?
            </label>

            <select
              value={recordType}
              onChange={(event) => {
                setRecordType(event.target.value as RecordType);
                setMessage("");
              }}
              className="mt-2 w-full rounded-[12px] border border-ud bg-ud-surface px-4 py-3 text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/20 focus:border-ud-accent"
            >
              {recordTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-sm leading-6 text-ud-muted">
              {selectedType?.description}
            </p>

            <p className="mt-2 text-xs text-ud-muted">
              Not sure about column names?{" "}
              <a
                href={`/templates/${recordType}-template.csv`}
                download
                className="font-semibold text-ud-muted underline underline-offset-2 hover:text-ud-ink"
              >
                Download template
              </a>
            </p>
          </div>

          <div className="rounded-[14px] border border-dashed border-ud bg-ud-surface-sunk p-5">
            <label className="text-sm font-medium text-ud-muted">
              CSV or Excel file
            </label>

            <input
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setMessage("");
              }}
              className="mt-3 w-full rounded-[12px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-muted outline-none file:mr-4 file:rounded-[8px] file:border-0 file:bg-ud-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />

            {file && (
              <p className="mt-3 text-sm font-medium text-ud-muted">
                Selected: {file.name}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={analyzeCsv}
            disabled={!file || analyzing}
            className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-ud-ink px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {analyzing && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {analyzing ? "Analyzing file..." : "Analyze file"}
          </button>
        </>
      )}

      {step === "mapping" && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-ud-ink">
            Review column mapping
          </p>
          <p className="text-sm text-ud-muted">
            We matched your columns to UnifData fields. Adjust any that look
            wrong, then confirm.
          </p>
          <div className="divide-y divide-slate-100 rounded-[12px] border border-ud bg-ud-surface">
            {detectedHeaders.map((header) => (
              <div key={header} className="flex items-center gap-4 px-4 py-3">
                <p className="w-1/2 truncate text-sm font-medium text-ud-muted">
                  &ldquo;{header}&rdquo;
                </p>
                <select
                  value={headerToField[header] ?? ""}
                  onChange={(e) =>
                    setHeaderToField((m) => ({
                      ...m,
                      [header]: e.target.value,
                    }))
                  }
                  className="w-1/2 rounded-[8px] border border-ud bg-ud-surface px-3 py-2 text-sm text-ud-ink outline-none"
                >
                  <option value="">Don&apos;t import</option>
                  {getFieldOptions(recordType).map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="rounded-[12px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk"
            >
              Back
            </button>
            <button
              type="button"
              onClick={confirmAndCreate}
              disabled={analyzing}
              className="flex-1 rounded-[12px] bg-ud-ink px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {analyzing ? "Importing…" : "Confirm and import"}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="flex items-start justify-between gap-3 rounded-[12px] border border-ud bg-ud-surface p-4">
          <p className="text-sm font-semibold text-ud-muted">{message}</p>
          <button
            type="button"
            onClick={() => setMessage("")}
            className="shrink-0 text-ud-faint hover:text-ud-muted"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
