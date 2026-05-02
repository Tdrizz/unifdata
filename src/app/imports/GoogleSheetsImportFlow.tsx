"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RecordType =
  | "relationships"
  | "opportunities"
  | "work"
  | "revenue"
  | "actions";

type SheetTab = {
  title: string;
  rowCount: number | null;
};

const recordTypes: {
  value: RecordType;
  label: string;
}[] = [
  { value: "relationships", label: "Relationships" },
  { value: "opportunities", label: "Opportunities" },
  { value: "work", label: "Work" },
  { value: "revenue", label: "Revenue" },
  { value: "actions", label: "Actions" },
];

export function GoogleSheetsImportFlow() {
  const router = useRouter();

  const [spreadsheetInput, setSpreadsheetInput] = useState("");
  const [spreadsheetTitle, setSpreadsheetTitle] = useState("");
  const [tabs, setTabs] = useState<SheetTab[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [recordType, setRecordType] = useState<RecordType>("relationships");
  const [message, setMessage] = useState("");
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  async function loadTabs() {
    setMessage("");
    setTabs([]);
    setSheetName("");
    setSpreadsheetTitle("");

    if (!spreadsheetInput.trim()) {
      setMessage("Paste a Google Sheet URL or spreadsheet ID first.");
      return;
    }

    setLoadingTabs(true);

    try {
      const response = await fetch(
        `/api/integrations/google/sheets?spreadsheetId=${encodeURIComponent(
          spreadsheetInput,
        )}`,
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to load Google Sheet tabs.");
        return;
      }

      setSpreadsheetTitle(data.title || "Google Sheet");
      setTabs(data.sheets || []);
      setSheetName(data.sheets?.[0]?.title || "");
      setMessage("Sheet loaded. Choose a tab and import type.");
    } catch {
      setMessage("Something went wrong loading the Google Sheet.");
    } finally {
      setLoadingTabs(false);
    }
  }

  async function analyzeSheet() {
    setMessage("");

    if (!spreadsheetInput.trim() || !sheetName) {
      setMessage("Load a Google Sheet and choose a tab first.");
      return;
    }

    setAnalyzing(true);

    try {
      const response = await fetch("/api/import-sessions/google-sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spreadsheetIdOrUrl: spreadsheetInput,
          sheetName,
          recordType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to analyze Google Sheet.");
        return;
      }

      router.push(`/imports/sessions/${data.session_id}`);
    } catch {
      setMessage("Something went wrong analyzing the Google Sheet.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700">
          Google Sheet URL or ID
        </label>
        <input
          value={spreadsheetInput}
          onChange={(event) => setSpreadsheetInput(event.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>

      <button
        type="button"
        onClick={loadTabs}
        disabled={loadingTabs}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingTabs ? "Loading tabs..." : "Load sheet tabs"}
      </button>

      {tabs.length > 0 && (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div>
            <p className="font-semibold text-slate-950">{spreadsheetTitle}</p>
            <p className="mt-1 text-sm text-slate-500">
              Choose the tab and data type to analyze.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Sheet tab
            </label>
            <select
              value={sheetName}
              onChange={(event) => setSheetName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
            >
              {tabs.map((tab) => (
                <option key={tab.title} value={tab.title}>
                  {tab.title}
                  {tab.rowCount ? ` · ${tab.rowCount} rows` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Import as
            </label>
            <select
              value={recordType}
              onChange={(event) =>
                setRecordType(event.target.value as RecordType)
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
            >
              {recordTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={analyzeSheet}
            disabled={analyzing}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {analyzing ? "Analyzing sheet..." : "Analyze Google Sheet"}
          </button>
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
          {message}
        </div>
      )}
    </div>
  );
}
