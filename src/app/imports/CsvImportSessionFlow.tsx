"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RecordType =
  | "relationships"
  | "opportunities"
  | "work"
  | "revenue"
  | "actions";

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

export function CsvImportSessionFlow() {
  const router = useRouter();

  const [recordType, setRecordType] = useState<RecordType>("relationships");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  async function analyzeCsv() {
    setMessage("");

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

      router.push(`/imports/sessions/${data.session_id}`);
    } catch {
      setMessage("Something went wrong while analyzing the CSV.");
    } finally {
      setAnalyzing(false);
    }
  }

  const selectedType = recordTypes.find((type) => type.value === recordType);

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
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {analyzing && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {analyzing ? "Analyzing CSV..." : "Analyze CSV"}
      </button>

      {message && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">{message}</p>
          <button
            type="button"
            onClick={() => setMessage("")}
            className="shrink-0 text-slate-400 hover:text-slate-600"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
