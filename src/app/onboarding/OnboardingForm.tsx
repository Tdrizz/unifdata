"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { businessSectorOptions } from "@/lib/industry-profiles";
import {
  createCompanyStepAction,
  createWizardCustomersAction,
  createWizardJobAction,
  createWizardFollowUpAction,
} from "./actions";

const INDUSTRY_ICONS: Record<string, string> = {
  general: "📊",
  medical: "🩺",
  construction: "🏗️",
  home_services: "⚙️",
  professional_services: "💼",
};

const INDUSTRY_DESCRIPTIONS: Record<string, string> = {
  general: "Any other business type",
  medical: "Medical, dental, chiropractic, veterinary",
  construction: "Contractors, builders, tradespeople",
  home_services: "HVAC, plumbing, landscaping, cleaning",
  professional_services: "Consulting, accounting, legal, IT",
};

const STEP_LABELS = [
  "Your business",
  "Import contacts",
  "First job",
  "First follow-up",
  "Finishing up",
];

const INPUT_CLS =
  "mt-2 w-full rounded-[10px] border border-white/10 bg-ud-surface px-4 py-3 text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 placeholder:text-ud-faint";

const BTN_PRIMARY =
  "w-full rounded-[10px] bg-ud-accent px-4 py-3.5 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

const BTN_GHOST =
  "w-full rounded-[10px] border border-white/10 px-4 py-3 text-sm text-ud-muted hover:border-white/20 hover:text-ud-ink";

type ManualRow = { name: string; phone: string; email: string };
type MiniCustomer = { id: string; name: string };
type FieldTarget = "first_name" | "last_name" | "full_name" | "email" | "phone" | "skip";

const FIELD_OPTIONS: Array<{ value: FieldTarget; label: string }> = [
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "full_name", label: "Full Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "skip", label: "Skip" },
];

function guessFieldTarget(header: string): FieldTarget {
  const h = header.toLowerCase().trim();
  if (/^name$|full.?name|display.?name/.test(h)) return "full_name";
  if (/first.?name|fname|given.?name|^given$/.test(h)) return "first_name";
  if (/last.?name|lname|surname|family.?name|^family$/.test(h)) return "last_name";
  if (/email|e.?mail/.test(h)) return "email";
  if (/phone|mobile|cell|telephone|^tel$/.test(h)) return "phone";
  return "skip";
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { field += line[i++]; }
      }
      fields.push(field.trim());
      if (line[i] === "," || line[i] === "\t") i++;
    } else {
      const sep = line.indexOf(",", i) === -1 ? line.indexOf("\t", i) : line.indexOf("\t", i) === -1 ? line.indexOf(",", i) : Math.min(line.indexOf(",", i), line.indexOf("\t", i));
      const end = sep === -1 ? line.length : sep;
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

function applyMapping(
  rawRows: string[][],
  headers: string[],
  mapping: Record<string, FieldTarget>,
): Array<{ name: string; phone: string; email: string }> {
  return rawRows
    .map((cols) => {
      let firstName = "";
      let lastName = "";
      let fullName = "";
      let email = "";
      let phone = "";
      headers.forEach((header, i) => {
        const val = cols[i]?.trim() ?? "";
        const target = mapping[header];
        if (target === "first_name") firstName = val;
        else if (target === "last_name") lastName = val;
        else if (target === "full_name") fullName = val;
        else if (target === "email") email = val;
        else if (target === "phone") phone = val;
      });
      const name = fullName || [firstName, lastName].filter(Boolean).join(" ");
      return { name, phone, email };
    })
    .filter((r) => r.name);
}

function downloadCsvTemplate() {
  const content = "First Name,Last Name,Email,Phone\n";
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "unifdata_contacts_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5">
        {STEP_LABELS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              i + 1 <= step ? "bg-ud-accent" : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-ud-faint">
        Step {step} of {STEP_LABELS.length} — {STEP_LABELS[step - 1]}
      </p>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-[10px] border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-300">
      {message}
    </div>
  );
}

function CustomerSelect({
  customers,
  value,
  onChange,
}: {
  customers: MiniCustomer[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (!customers.length) return null;
  return (
    <div>
      <label className="text-sm font-medium text-ud-ink">Link to contact (optional)</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-[10px] border border-white/10 bg-ud-surface px-4 py-3 text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40"
      >
        <option value="">No contact linked</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [createdCustomers, setCreatedCustomers] = useState<MiniCustomer[]>([]);
  const [isPending, startTransition] = useTransition();
  const [stepError, setStepError] = useState<string | null>(null);

  // Step 2 — manual
  const [contactMode, setContactMode] = useState<"manual" | "csv">("manual");
  const [manualRows, setManualRows] = useState<ManualRow[]>([{ name: "", phone: "", email: "" }]);

  // Step 2 — CSV
  const [csvText, setCsvText] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<string[][]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, FieldTarget>>({});
  const [csvWarning, setCsvWarning] = useState<string | null>(null);

  // Step 3
  const [jobServiceType, setJobServiceType] = useState("");
  const [jobStartDateState, setJobStartDateState] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [jobCustomerId, setJobCustomerId] = useState("");

  // Step 4
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [followUpCustomerId, setFollowUpCustomerId] = useState("");
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  // Step 5: auto-generate brief then redirect
  useEffect(() => {
    if (step !== 5) return;
    fetch("/api/ai/business-summary", { method: "POST", credentials: "include" }).finally(() => {
      router.push("/workspace");
    });
  }, [step, router]);

  function handleCSVChange(text: string) {
    setCsvText(text);
    setCsvWarning(null);
    if (!text.trim()) {
      setCsvHeaders([]);
      setCsvRawRows([]);
      setCsvMapping({});
      return;
    }

    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const firstLower = lines[0].toLowerCase();
    const hasHeader =
      firstLower.includes("name") ||
      firstLower.includes("email") ||
      firstLower.includes("phone") ||
      firstLower.includes("first") ||
      firstLower.includes("last");

    let headers: string[];
    let dataLines: string[];

    if (hasHeader) {
      headers = splitCsvLine(lines[0]);
      dataLines = lines.slice(1);
    } else {
      const colCount = splitCsvLine(lines[0]).length;
      headers = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
      dataLines = lines;
    }

    let rawRows = dataLines.map(splitCsvLine);
    let warning: string | null = null;
    if (rawRows.length > 500) {
      rawRows = rawRows.slice(0, 500);
      warning = "Capped at 500 contacts — only the first 500 will be imported.";
    }

    const initialMapping: Record<string, FieldTarget> = {};
    headers.forEach((h) => {
      initialMapping[h] = guessFieldTarget(h);
    });

    setCsvHeaders(headers);
    setCsvRawRows(rawRows);
    setCsvMapping(initialMapping);
    setCsvWarning(warning);
  }

  const csvPreview = csvHeaders.length ? applyMapping(csvRawRows, csvHeaders, csvMapping) : [];

  // Step 1
  function handleStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStepError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createCompanyStepAction(fd);
      if (result.error) {
        setStepError(result.error);
      } else if (result.companyId) {
        setCompanyId(result.companyId);
        setStep(2);
      }
    });
  }

  // Step 2
  function handleStep2() {
    setStepError(null);
    const customers =
      contactMode === "csv"
        ? csvPreview
        : manualRows.filter((r) => r.name.trim());

    if (!customers.length) {
      setStep(3);
      return;
    }
    startTransition(async () => {
      const result = await createWizardCustomersAction(customers, companyId!);
      if (result.error) {
        setStepError(result.error);
      } else {
        setCreatedCustomers(result.created);
        setStep(3);
      }
    });
  }

  // Step 3
  function handleStep3(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStepError(null);
    startTransition(async () => {
      const result = await createWizardJobAction(
        {
          service_type: jobServiceType,
          start_date: jobStartDateState,
          customer_id: jobCustomerId || undefined,
        },
        companyId!,
      );
      if (result.error) {
        setStepError(result.error);
      } else {
        setStep(4);
      }
    });
  }

  // Step 4
  function handleStep4(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStepError(null);
    startTransition(async () => {
      const result = await createWizardFollowUpAction(
        {
          message: followUpMessage,
          due_date: followUpDate,
          customer_id: followUpCustomerId || undefined,
        },
        companyId!,
      );
      if (result.error) {
        setStepError(result.error);
      } else {
        setStep(5);
      }
    });
  }

  // ── Step 1 ──────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <>
        <ProgressBar step={1} />
        <form onSubmit={handleStep1} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-ud-ink">Company name</label>
            <input
              name="companyName"
              className={INPUT_CLS}
              placeholder="Arctic Ridge Services"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ud-ink">Business type</label>
            <p className="mt-1 text-xs leading-5 text-ud-faint">
              This controls the language and priorities shown across your workspace.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {businessSectorOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex flex-col items-start gap-2 rounded-[10px] border border-white/10 bg-ud-surface/5 p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-[120ms] ease-out cursor-pointer hover:border-white/20 hover:bg-white/10 has-[:checked]:border-ud-accent has-[:checked]:bg-[rgba(74,63,168,0.15)] has-[:checked]:ring-1 has-[:checked]:ring-ud-accent"
                >
                  <input
                    type="radio"
                    name="businessSector"
                    value={option.value}
                    defaultChecked={option.value === "general"}
                    className="sr-only"
                  />
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-lg"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    {INDUSTRY_ICONS[option.value] ?? "📊"}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold leading-snug text-ud-ink">
                      {option.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-ud-faint">
                      {INDUSTRY_DESCRIPTIONS[option.value] ?? ""}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-ud-ink">
              Describe your work <span className="text-ud-faint">(optional)</span>
            </label>
            <input
              name="industry"
              className={INPUT_CLS}
              placeholder="Excavation, dental office, landscaping..."
            />
          </div>

          {stepError && <ErrorBox message={stepError} />}

          <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
            {isPending ? "Creating workspace…" : "Continue →"}
          </button>
        </form>
      </>
    );
  }

  // ── Step 2 ──────────────────────────────────────────────────────────────
  if (step === 2) {
    const activeTab = "border-ud-accent text-ud-ink";
    const inactiveTab = "border-transparent text-ud-muted hover:text-ud-ink";
    return (
      <>
        <ProgressBar step={2} />
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-ud-ink">Add your contacts</p>
            <p className="mt-1 text-xs text-ud-faint">
              Import existing customers so the workspace feels alive from day one.
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex border-b border-white/10">
            {(["manual", "csv"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setContactMode(mode)}
                className={`pb-2 pr-4 text-sm font-medium border-b-2 transition-colors ${
                  contactMode === mode ? activeTab : inactiveTab
                }`}
              >
                {mode === "manual" ? "Add manually" : "Paste CSV"}
              </button>
            ))}
          </div>

          {/* Manual entry */}
          {contactMode === "manual" && (
            <div className="space-y-2">
              {manualRows.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="Name"
                    value={row.name}
                    onChange={(e) => {
                      const updated = [...manualRows];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setManualRows(updated);
                    }}
                    className="flex-1 rounded-[10px] border border-white/10 bg-ud-surface px-3 py-2.5 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 placeholder:text-ud-faint"
                  />
                  <input
                    placeholder="Phone"
                    value={row.phone}
                    onChange={(e) => {
                      const updated = [...manualRows];
                      updated[i] = { ...updated[i], phone: e.target.value };
                      setManualRows(updated);
                    }}
                    className="w-28 rounded-[10px] border border-white/10 bg-ud-surface px-3 py-2.5 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 placeholder:text-ud-faint"
                  />
                  <input
                    placeholder="Email"
                    value={row.email}
                    onChange={(e) => {
                      const updated = [...manualRows];
                      updated[i] = { ...updated[i], email: e.target.value };
                      setManualRows(updated);
                    }}
                    className="w-36 rounded-[10px] border border-white/10 bg-ud-surface px-3 py-2.5 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 placeholder:text-ud-faint"
                  />
                  {manualRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setManualRows(manualRows.filter((_, j) => j !== i))}
                      className="px-2 text-ud-faint hover:text-red-400"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {manualRows.length < 5 && (
                <button
                  type="button"
                  onClick={() =>
                    setManualRows([...manualRows, { name: "", phone: "", email: "" }])
                  }
                  className="text-xs text-ud-accent hover:opacity-80"
                >
                  + Add another
                </button>
              )}
            </div>
          )}

          {/* CSV import */}
          {contactMode === "csv" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-ud-faint">Paste your CSV below or</p>
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="text-xs text-ud-accent hover:opacity-80 underline underline-offset-2"
                >
                  Download template ↓
                </button>
              </div>

              <textarea
                rows={5}
                placeholder={"First Name,Last Name,Email,Phone\nJane,Smith,jane@email.com,555-0100"}
                value={csvText}
                onChange={(e) => handleCSVChange(e.target.value)}
                className="w-full rounded-[10px] border border-white/10 bg-ud-surface px-4 py-3 font-mono text-xs text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 placeholder:text-ud-faint"
              />

              {csvWarning && <p className="text-xs text-amber-400">{csvWarning}</p>}

              {/* Column mapping */}
              {csvHeaders.length > 0 && (
                <div className="rounded-[10px] border border-white/10 bg-white/5 p-3 space-y-2">
                  <p className="text-xs font-medium text-ud-muted mb-1">Map columns</p>
                  {csvHeaders.map((header) => (
                    <div key={header} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-ud-ink truncate max-w-[120px]" title={header}>
                        {header}
                      </span>
                      <select
                        value={csvMapping[header] ?? "skip"}
                        onChange={(e) =>
                          setCsvMapping((prev) => ({
                            ...prev,
                            [header]: e.target.value as FieldTarget,
                          }))
                        }
                        className="rounded-[8px] border border-white/10 bg-ud-surface px-2 py-1 text-xs text-ud-ink outline-none focus:ring-1 focus:ring-ud-accent/40"
                      >
                        {FIELD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview */}
              {csvPreview.length > 0 && (
                <div className="rounded-[10px] border border-white/10 bg-white/5 p-3">
                  <p className="mb-2 text-xs font-medium text-ud-muted">
                    Preview — {csvPreview.length} contact{csvPreview.length !== 1 ? "s" : ""}{" "}
                    detected
                  </p>
                  <div className="space-y-1">
                    {csvPreview.slice(0, 8).map((r, i) => (
                      <p key={i} className="text-xs text-ud-ink">
                        {r.name}
                        {r.phone ? ` · ${r.phone}` : ""}
                        {r.email ? ` · ${r.email}` : ""}
                      </p>
                    ))}
                    {csvPreview.length > 8 && (
                      <p className="text-xs text-ud-faint">and {csvPreview.length - 8} more…</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {stepError && <ErrorBox message={stepError} />}

          <button type="button" disabled={isPending} onClick={handleStep2} className={BTN_PRIMARY}>
            {isPending ? "Saving…" : "Continue →"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStepError(null);
              setStep(3);
            }}
            className={BTN_GHOST}
          >
            Skip this step
          </button>
        </div>
      </>
    );
  }

  // ── Step 3 ──────────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <>
        <ProgressBar step={3} />
        <form onSubmit={handleStep3} className="space-y-5">
          <div>
            <p className="text-sm font-medium text-ud-ink">Log your first job</p>
            <p className="mt-1 text-xs text-ud-faint">
              Add an upcoming job or service visit so your dashboard has something to show.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-ud-ink">Service type</label>
            <input
              value={jobServiceType}
              onChange={(e) => setJobServiceType(e.target.value)}
              className={INPUT_CLS}
              placeholder="HVAC tune-up, fence installation, consultation…"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ud-ink">Start date</label>
            <input
              type="date"
              value={jobStartDateState}
              onChange={(e) => setJobStartDateState(e.target.value)}
              className={INPUT_CLS}
            />
          </div>

          <CustomerSelect
            customers={createdCustomers}
            value={jobCustomerId}
            onChange={setJobCustomerId}
          />

          {stepError && <ErrorBox message={stepError} />}

          <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
            {isPending ? "Saving…" : "Continue →"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStepError(null);
              setStep(4);
            }}
            className={BTN_GHOST}
          >
            Skip this step
          </button>
        </form>
      </>
    );
  }

  // ── Step 4 ──────────────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <>
        <ProgressBar step={4} />
        <form onSubmit={handleStep4} className="space-y-5">
          <div>
            <p className="text-sm font-medium text-ud-ink">Add a follow-up reminder</p>
            <p className="mt-1 text-xs text-ud-faint">
              Set a task to check in with a customer or prospect next week.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-ud-ink">Note</label>
            <textarea
              rows={3}
              value={followUpMessage}
              onChange={(e) => setFollowUpMessage(e.target.value)}
              className="mt-2 w-full rounded-[10px] border border-white/10 bg-ud-surface px-4 py-3 text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 placeholder:text-ud-faint"
              placeholder="Follow up on the proposal, check if the job went well…"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ud-ink">Due date</label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className={INPUT_CLS}
              required
            />
          </div>

          <CustomerSelect
            customers={createdCustomers}
            value={followUpCustomerId}
            onChange={setFollowUpCustomerId}
          />

          {stepError && <ErrorBox message={stepError} />}

          <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
            {isPending ? "Saving…" : "Finish setup →"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStepError(null);
              setStep(5);
            }}
            className={BTN_GHOST}
          >
            Skip this step
          </button>
        </form>
      </>
    );
  }

  // ── Step 5 ──────────────────────────────────────────────────────────────
  return (
    <>
      <ProgressBar step={5} />
      <div className="flex flex-col items-center py-10 text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-ud-accent/20">
          <svg className="h-6 w-6 animate-spin text-ud-accent" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </div>
        <p className="text-[15px] font-semibold text-ud-ink">Generating your Operating Brief…</p>
        <p className="mt-2 text-sm text-ud-faint">
          Your workspace is ready. We&apos;re putting together a first-day briefing — this takes a
          few seconds.
        </p>
      </div>
    </>
  );
}
