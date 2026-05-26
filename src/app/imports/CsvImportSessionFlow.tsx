"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { importFieldDefinitions } from "@/lib/import-engine-fields";
import { ColumnMapper } from "@/features/imports/components/ColumnMapper";
import type { ColumnMapping } from "@/lib/imports/fuzzy-mapper";
import { acceptedFileExtensions } from "@/lib/imports/parser";
import { useProfile } from "@/lib/profile-context";
import type { IndustryProfile } from "@/lib/industry-profiles";

type RecordType =
  | "relationships"
  | "opportunities"
  | "work"
  | "revenue"
  | "actions";

type Step = "upload" | "mapping";

function getRecordTypes(profile: IndustryProfile): {
  value: RecordType;
  label: string;
  description: string;
}[] {
  return [
    {
      value: "relationships",
      label: "Relationships",
      description:
        "People, clients, customers, patients, companies, or accounts.",
    },
    {
      value: "opportunities",
      label: profile.labels.leadPlural,
      description:
        "Quotes, inquiries, proposals, treatment plans, policies, or deals.",
    },
    {
      value: "work",
      label: profile.labels.jobPlural,
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
}

function getFieldOptions(recordType: string) {
  return (
    importFieldDefinitions[recordType as keyof typeof importFieldDefinitions] ??
    []
  );
}
void getFieldOptions; // used by legacy mapping UI, kept for reference

export function CsvImportSessionFlow() {
  const router = useRouter();
  const profile = useProfile();
  const recordTypes = getRecordTypes(profile);

  const [recordType, setRecordType] = useState<RecordType>("relationships");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);

  const [step, setStep] = useState<Step>("upload");
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [detectedRows, setDetectedRows] = useState<Record<string, string>[]>([]);
  const [aiMapping, setAiMapping] = useState<ColumnMapping>({});

  async function analyzeCsv() {
    setMessage("");

    if (!file) {
      setMessage("Choose a file first.");
      return;
    }

    setAnalyzing(true);

    try {
      // Step 1: parse file and get headers/rows
      const formData = new FormData();
      formData.append("recordType", recordType);
      formData.append("csvFile", file);

      const parseRes = await fetch("/api/import-sessions/csv?analyze=1", {
        method: "POST",
        body: formData,
      });

      const parseData = await parseRes.json();

      if (!parseRes.ok) {
        setMessage(parseData.error || "Failed to analyze file.");
        return;
      }

      const headers: string[] = parseData.headers ?? [];

      // Step 2: ask AI mapper for confidence-scored mapping
      let mapping: ColumnMapping = {};

      try {
        const mapRes = await fetch("/api/imports/map-columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headers,
            recordType,
            sampleRows: detectedRows.slice(0, 3),
          }),
        });

        if (mapRes.ok) {
          const mapData = await mapRes.json();
          mapping = mapData.mapping ?? {};
        }
      } catch {
        // AI mapping failed — fall back to server-guessed mapping
        const serverMapping = parseData.mapping ?? {};
        // Convert legacy { fieldKey: column } format to ColumnMapping
        for (const [k, v] of Object.entries(serverMapping)) {
          mapping[k] = { column: v as string, confidence: 0.75 };
        }
      }

      setDetectedHeaders(headers);
      setDetectedRows(parseData.rows ?? []);
      setAiMapping(mapping);
      setStep("mapping");
    } catch {
      setMessage("Something went wrong while analyzing the file.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleConfirmMapping(confirmedMapping: Record<string, string>) {
    if (!file) return;

    setImporting(true);

    try {
      // Convert { fieldKey: column } → the legacy format the import engine expects
      // (which is also { fieldKey: column })
      const formData = new FormData();
      formData.append("recordType", recordType);
      formData.append("csvFile", file);
      formData.append("mapping", JSON.stringify(confirmedMapping));

      const response = await fetch("/api/import-sessions/csv", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to create import.");
        setStep("upload");
        return;
      }

      router.push(`/imports/sessions/${data.session_id}`);
    } catch {
      setMessage("Something went wrong while creating the import.");
      setStep("upload");
    } finally {
      setImporting(false);
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
              Spreadsheet or CSV file
            </label>

            <input
              type="file"
              accept={acceptedFileExtensions()}
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setMessage("");
              }}
              className="mt-3 w-full rounded-[12px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-muted outline-none file:mr-4 file:rounded-[8px] file:border-0 file:bg-ud-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />

            <p className="mt-2 text-xs text-ud-muted">
              CSV, TSV, Excel (.xlsx, .xls), ODS, or Apple Numbers
            </p>

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
        <ColumnMapper
          headers={detectedHeaders}
          mapping={aiMapping}
          recordType={recordType}
          onConfirm={handleConfirmMapping}
          onBack={() => setStep("upload")}
          busy={importing}
        />
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
