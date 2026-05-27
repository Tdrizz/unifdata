"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProfile } from "@/lib/profile-context";
import type { IndustryProfile } from "@/lib/industry-profiles";

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

type PickerDocument = Record<string, string>;
type PickerCallbackData = Record<string, unknown>;

type GooglePickerDocsView = {
  setMimeTypes: (mimeTypes: string) => GooglePickerDocsView;
  setIncludeFolders: (includeFolders: boolean) => GooglePickerDocsView;
};

type GooglePickerBuilder = {
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setAppId: (appId: string) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  addView: (view: GooglePickerDocsView) => GooglePickerBuilder;
  setCallback: (
    callback: (data: PickerCallbackData) => void,
  ) => GooglePickerBuilder;
  build: () => {
    setVisible: (visible: boolean) => void;
  };
};

type GooglePickerNamespace = {
  PickerBuilder: new () => GooglePickerBuilder;
  DocsView: new (viewId: string) => GooglePickerDocsView;
  ViewId: {
    SPREADSHEETS: string;
  };
  Response: {
    ACTION: string;
    DOCUMENTS: string;
  };
  Action: {
    PICKED: string;
  };
  Document: {
    ID: string;
    NAME: string;
    URL: string;
  };
};

type GoogleWindow = Window &
  typeof globalThis & {
    gapi?: {
      load: (api: string, callback: () => void) => void;
    };
    google?: {
      picker?: GooglePickerNamespace;
    };
  };

function getRecordTypes(profile: IndustryProfile): { value: RecordType; label: string }[] {
  return [
    { value: "relationships", label: "Relationships" },
    { value: "opportunities", label: profile.labels.leadPlural },
    { value: "work", label: profile.labels.jobPlural },
    { value: "revenue", label: "Revenue" },
    { value: "actions", label: "Actions" },
  ];
}

const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const googlePickerAppId = process.env.NEXT_PUBLIC_GOOGLE_PICKER_APP_ID;

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));

    document.body.appendChild(script);
  });
}

async function loadPickerApi() {
  await loadScript("https://apis.google.com/js/api.js", "google-api-js");

  const googleWindow = window as GoogleWindow;

  if (!googleWindow.gapi) {
    throw new Error("Google API script did not load.");
  }

  await new Promise<void>((resolve) => {
    googleWindow.gapi?.load("picker", resolve);
  });

  if (!googleWindow.google?.picker) {
    throw new Error("Google Picker did not load.");
  }

  return googleWindow.google.picker;
}

export function GoogleSheetsImportFlow() {
  const router = useRouter();
  const profile = useProfile();
  const recordTypes = getRecordTypes(profile);

  const [spreadsheetInput, setSpreadsheetInput] = useState("");
  const [spreadsheetTitle, setSpreadsheetTitle] = useState("");
  const [tabs, setTabs] = useState<SheetTab[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [recordType, setRecordType] = useState<RecordType>("relationships");
  const [message, setMessage] = useState("");
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  async function loadTabsForSpreadsheet(input: string) {
    setMessage("");
    setTabs([]);
    setSheetName("");

    if (!input.trim()) {
      setMessage("Choose a Google Sheet first.");
      return;
    }

    setLoadingTabs(true);

    try {
      const response = await fetch(
        `/api/integrations/google/sheets?spreadsheetId=${encodeURIComponent(
          input,
        )}`,
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to load Google Sheet tabs.");
        return;
      }

      setSpreadsheetInput(data.spreadsheetId || input);
      setSpreadsheetTitle(data.title || "Google Sheet");
      setTabs(data.sheets || []);
      setSheetName(data.sheets?.[0]?.title || "");
      setMessage("Sheet selected. Choose a tab and import type.");
    } catch {
      setMessage("Something went wrong loading the Google Sheet.");
    } finally {
      setLoadingTabs(false);
    }
  }

  async function openGooglePicker() {
    setMessage("");

    if (!googleApiKey || !googlePickerAppId) {
      setMessage(
        "Missing Google Picker env vars. Add NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_PICKER_APP_ID.",
      );
      return;
    }

    setLoadingPicker(true);

    try {
      const tokenResponse = await fetch(
        "/api/integrations/google/picker-token",
      );
      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        setMessage(tokenData.error || "Failed to get Google Picker token.");
        return;
      }

      const picker = await loadPickerApi();

      const view = new picker.DocsView(picker.ViewId.SPREADSHEETS)
        .setMimeTypes("application/vnd.google-apps.spreadsheet")
        .setIncludeFolders(false);

      const pickerDialog = new picker.PickerBuilder()
        .setDeveloperKey(googleApiKey)
        .setAppId(googlePickerAppId)
        .setOAuthToken(tokenData.access_token)
        .addView(view)
        .setCallback((data: PickerCallbackData) => {
          const action = data[picker.Response.ACTION];

          if (action !== picker.Action.PICKED) {
            return;
          }

          const documents = data[picker.Response.DOCUMENTS] as
            | PickerDocument[]
            | undefined;

          const selectedDocument = documents?.[0];

          if (!selectedDocument) {
            setMessage("No Google Sheet selected.");
            return;
          }

          const spreadsheetId = selectedDocument[picker.Document.ID];
          const selectedName = selectedDocument[picker.Document.NAME];

          if (!spreadsheetId) {
            setMessage("Could not read selected Google Sheet ID.");
            return;
          }

          setSpreadsheetInput(spreadsheetId);
          setSpreadsheetTitle(selectedName || "Google Sheet");
          void loadTabsForSpreadsheet(spreadsheetId);
        })
        .build();

      pickerDialog.setVisible(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong opening Google Picker.",
      );
    } finally {
      setLoadingPicker(false);
    }
  }

  async function analyzeSheet() {
    setMessage("");

    if (!spreadsheetInput.trim() || !sheetName) {
      setMessage("Choose a Google Sheet and tab first.");
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
    <div className="space-y-3">
      <button
        type="button"
        onClick={openGooglePicker}
        disabled={loadingPicker || loadingTabs}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-ud-ink px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {(loadingPicker || loadingTabs) && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {loadingPicker
          ? "Opening picker..."
          : loadingTabs
            ? "Loading tabs..."
            : "Choose Google Sheet"}
      </button>

      {spreadsheetInput && (
        <div className="rounded-[12px] border border-ud bg-ud-surface px-4 py-3">
          <p className="text-sm font-semibold text-ud-ink">
            {spreadsheetTitle || "Selected Google Sheet"}
          </p>
          <p className="mt-1 break-all text-xs text-ud-muted">
            {spreadsheetInput}
          </p>
        </div>
      )}

      {tabs.length > 0 && (
        <div className="space-y-3 rounded-[12px] border border-ud bg-ud-surface p-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ud-muted">
              Sheet tab
            </label>
            <select
              value={sheetName}
              onChange={(event) => setSheetName(event.target.value)}
              className="mt-2 w-full rounded-[12px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/20 focus:border-ud-accent"
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
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ud-muted">
              Import as
            </label>
            <select
              value={recordType}
              onChange={(event) =>
                setRecordType(event.target.value as RecordType)
              }
              className="mt-2 w-full rounded-[12px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/20 focus:border-ud-accent"
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
            className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-ud-ink px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {analyzing && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {analyzing ? "Analyzing sheet..." : "Analyze Google Sheet"}
          </button>
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
            ×
          </button>
        </div>
      )}
    </div>
  );
}
