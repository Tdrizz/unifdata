"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { businessSectorOptionsFlat, getIndustryProfile } from "@/lib/industry-profiles";
import type { BusinessSector } from "@/lib/industry-profiles";
import {
  createCompanyStepAction,
  createWizardCustomersAction,
  createWizardJobAction,
  createWizardFollowUpAction,
} from "./actions";
import { ColumnMapper } from "@/features/imports/components/ColumnMapper";
import { acceptedFileExtensions } from "@/lib/imports/parser";
import type { ColumnMapping } from "@/lib/imports/fuzzy-mapper";

const SECTOR_CATEGORIES = [
  { key: "healthcare", label: "Healthcare", icon: "🩺", description: "Medical, dental, chiropractic, veterinary", sectors: ["dental","physical_therapy","mental_health","chiropractic","medical","veterinary"] },
  { key: "trades", label: "Trades", icon: "🔧", description: "Construction, electrical, plumbing, HVAC, roofing", sectors: ["construction","electrical","plumbing","hvac","roofing","general_contractor"] },
  { key: "home", label: "Home Services", icon: "🏠", description: "Landscaping, cleaning, pest control, painting", sectors: ["home_services","landscaping","cleaning","pest_control","painting"] },
  { key: "professional", label: "Professional Services", icon: "💼", description: "Legal, accounting, consulting, agency, IT", sectors: ["professional_services","legal","accounting","consulting","agency","it_services","financial_advisory"] },
  { key: "personal", label: "Personal Services", icon: "✂️", description: "Fitness, photography, beauty, auto, tattoo", sectors: ["fitness","photography","beauty","auto_repair","tattoo","auto_detailing"] },
  { key: "other", label: "Other", icon: "📊", description: "General, insurance, real estate, and more", sectors: ["general","insurance","real_estate"] },
] as const;

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
  const [substep, setSubstep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<typeof SECTOR_CATEGORIES[number] | null>(null);
  const [selectedSector, setSelectedSector] = useState<BusinessSector>("general");
  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [sector, setSector] = useState("general");
  const [createdCustomers, setCreatedCustomers] = useState<MiniCustomer[]>([]);
  const [isPending, startTransition] = useTransition();
  const [stepError, setStepError] = useState<string | null>(null);

  // Step 2 — manual
  const [contactMode, setContactMode] = useState<"manual" | "upload">("manual");
  const [manualRows, setManualRows] = useState<ManualRow[]>([{ name: "", phone: "", email: "" }]);

  // Step 2 — file upload
  const [uploadStep, setUploadStep] = useState<"file" | "mapping">("file");
  const [uploadHeaders, setUploadHeaders] = useState<string[]>([]);
  const [uploadRows, setUploadRows] = useState<Record<string, string>[]>([]);
  const [uploadMapping, setUploadMapping] = useState<ColumnMapping>({});
  const [uploadLoading, setUploadLoading] = useState(false);

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
    fetch("/api/ai/business-summary", { method: "POST", credentials: "include" })
      .then((res) => {
        router.push(
          res.ok
            ? "/workspace"
            : "/workspace?toast=Your+Operating+Brief+is+still+generating+—+check+back+in+a+minute"
        );
      })
      .catch(() => {
        router.push("/workspace?toast=Your+Operating+Brief+is+still+generating+—+check+back+in+a+minute");
      });
  }, [step, router]);

  async function analyzeUpload(file: File) {
    setUploadLoading(true);
    setStepError(null);
    try {
      const fd = new FormData();
      fd.append("csvFile", file);
      fd.append("recordType", "relationships");
      const parseRes = await fetch("/api/import-sessions/csv?analyze=1&includeRows=1", {
        method: "POST",
        body: fd,
      });
      const parseData = await parseRes.json();
      if (!parseRes.ok) {
        setStepError(parseData.error || "Could not read file.");
        return;
      }
      const headers: string[] = parseData.headers ?? [];
      const rows: Record<string, string>[] = parseData.rows ?? [];

      let mapping: ColumnMapping = {};
      try {
        const mapRes = await fetch("/api/imports/map-columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headers,
            recordType: "relationships",
            sampleRows: rows.slice(0, 3),
          }),
        });
        if (mapRes.ok) {
          const mapData = await mapRes.json();
          mapping = mapData.mapping ?? {};
        }
      } catch { /* keep empty mapping */ }

      setUploadHeaders(headers);
      setUploadRows(rows);
      setUploadMapping(mapping);
      setUploadStep("mapping");
    } catch {
      setStepError("Failed to read file. Try a CSV or Excel file.");
    } finally {
      setUploadLoading(false);
    }
  }

  function applyUploadMapping(
    confirmedMapping: Record<string, string>,
  ): Array<{ name: string; phone?: string; email?: string }> {
    return uploadRows
      .map((row) => ({
        name: confirmedMapping.name ? (row[confirmedMapping.name] ?? "") : "",
        phone: confirmedMapping.phone
          ? (row[confirmedMapping.phone] ?? undefined) || undefined
          : undefined,
        email: confirmedMapping.email
          ? (row[confirmedMapping.email] ?? undefined) || undefined
          : undefined,
      }))
      .filter((c) => c.name.trim())
      .slice(0, 500);
  }

  function handleUploadMappingConfirm(confirmedMapping: Record<string, string>) {
    setStepError(null);
    const customers = applyUploadMapping(confirmedMapping);
    if (!customers.length) {
      setStep(3);
      return;
    }
    startTransition(async () => {
      const result = await createWizardCustomersAction(customers, companyId!);
      if (result.error) {
        setStepError(result.error);
      } else {
        setCreatedCustomers(result.created ?? []);
        setStep(3);
      }
    });
  }

  async function handleNameBlur(name: string) {
    if (name.length < 3) return;
    try {
      const res = await fetch("/api/onboarding/detect-sector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const { sector: detected } = (await res.json()) as { sector: string | null };
      if (detected && selectedSector === "general") {
        setSelectedSector(detected as BusinessSector);
      }
    } catch {
      // detection is best-effort — ignore failures
    }
  }

  // Step 1
  function handleStep1Submit() {
    setStepError(null);
    const fd = new FormData();
    fd.append("companyName", companyName);
    fd.append("businessSector", selectedSector);
    startTransition(async () => {
      const result = await createCompanyStepAction(fd);
      if (result.error) {
        setStepError(result.error);
      } else if (result.companyId) {
        setCompanyId(result.companyId);
        setSector(selectedSector);
        setStep(2);
      }
    });
  }

  // Step 2 (manual mode only — upload mode is handled by handleUploadMappingConfirm)
  function handleStep2() {
    setStepError(null);
    const customers = manualRows.filter((r) => r.name.trim());

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
    // Substep 1: pick a category
    if (substep === 1) {
      return (
        <>
          <ProgressBar step={1} />
          <div className="mb-5">
            <p className="text-[17px] font-semibold text-ud-ink">What kind of business do you run?</p>
            <p className="mt-1 text-sm text-ud-faint">We&apos;ll tailor the language and workflow to fit your industry.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SECTOR_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setSubstep(2);
                }}
                className="flex flex-col items-start gap-2 rounded-[10px] border border-white/10 bg-ud-surface/5 p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-[120ms] ease-out cursor-pointer hover:border-white/20 hover:bg-white/10"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-lg"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  {cat.icon}
                </span>
                <div>
                  <p className="text-[13px] font-semibold leading-snug text-ud-ink">{cat.label}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-ud-faint">{cat.description}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      );
    }

    // Substep 2: pick specific sector + preview vocabulary
    if (substep === 2 && selectedCategory) {
      const sectorOptions = businessSectorOptionsFlat.filter((o) =>
        (selectedCategory.sectors as readonly string[]).includes(o.value)
      );
      const previewProfile = getIndustryProfile(selectedSector);
      const sectorInCategory = (selectedCategory.sectors as readonly string[]).includes(selectedSector);

      return (
        <>
          <ProgressBar step={1} />
          <button
            type="button"
            onClick={() => setSubstep(1)}
            className="mb-4 flex items-center gap-1 text-sm text-ud-muted hover:text-ud-ink"
          >
            ← Back
          </button>
          <div className="mb-5">
            <p className="text-[17px] font-semibold text-ud-ink">{selectedCategory.icon} {selectedCategory.label}</p>
            <p className="mt-1 text-sm text-ud-faint">Select the option that best matches your practice.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sectorOptions.map((option) => (
              <label
                key={option.value}
                className="flex flex-col items-start gap-2 rounded-[10px] border border-white/10 bg-ud-surface/5 p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-[120ms] ease-out cursor-pointer hover:border-white/20 hover:bg-white/10 has-[:checked]:border-ud-accent has-[:checked]:bg-[rgba(74,63,168,0.15)] has-[:checked]:ring-1 has-[:checked]:ring-ud-accent"
              >
                <input
                  type="radio"
                  name="sectorSubstep2"
                  value={option.value}
                  checked={selectedSector === option.value}
                  onChange={() => setSelectedSector(option.value as BusinessSector)}
                  className="sr-only"
                />
                <p className="text-[13px] font-semibold leading-snug text-ud-ink">{option.label}</p>
              </label>
            ))}
          </div>

          {sectorInCategory && (
            <div className="mt-4 rounded-[10px] border border-white/10 bg-ud-surface/10 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ud-faint">Vocabulary preview</p>
              <div className="space-y-1 text-sm text-ud-muted">
                <p>Contacts are called: <span className="text-ud-ink">{previewProfile.labels.customerSingular}</span></p>
                <p>Work records: <span className="text-ud-ink">{previewProfile.labels.jobSingular}</span></p>
                <p>Pipeline: <span className="text-ud-ink">{previewProfile.pipelineLabel}</span></p>
                <p>A process record: <span className="text-ud-ink">{previewProfile.recordLabel}</span></p>
                <p>Completed stage: <span className="text-ud-ink">{previewProfile.completedLabel}</span></p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSubstep(3)}
            disabled={!sectorInCategory}
            className={`mt-5 ${BTN_PRIMARY}`}
          >
            Continue →
          </button>
        </>
      );
    }

    // Substep 3: company name
    const currentCatForSector = SECTOR_CATEGORIES.find((c) =>
      (c.sectors as readonly string[]).includes(selectedSector)
    );
    const sectorLabel = getIndustryProfile(selectedSector).label;
    const categoryIcon = currentCatForSector?.icon ?? "📊";

    return (
      <>
        <ProgressBar step={1} />
        <div className="mb-5">
          <p className="text-[17px] font-semibold text-ud-ink">Name your workspace</p>
          <p className="mt-1 text-sm text-ud-faint">Enter your business name to finish setting up your workspace.</p>
        </div>

        <div className="mb-5 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-ud-accent/40 bg-ud-accent/10 px-3 py-1 text-sm text-ud-ink">
            {categoryIcon} {sectorLabel}
          </span>
          <button
            type="button"
            onClick={() => setSubstep(1)}
            className="text-xs text-ud-muted hover:text-ud-ink"
          >
            Change
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-ud-ink">Company name</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onBlur={(e) => handleNameBlur(e.target.value)}
              className={INPUT_CLS}
              placeholder="Arctic Ridge Services"
              required
            />
          </div>

          {stepError && <ErrorBox message={stepError} />}

          <button
            type="button"
            disabled={isPending || !companyName.trim()}
            onClick={handleStep1Submit}
            className={BTN_PRIMARY}
          >
            {isPending ? "Creating workspace…" : "Continue →"}
          </button>
        </div>
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
            <p className="text-sm font-medium text-ud-ink">Add your {getIndustryProfile(sector).labels.customerPlural.toLowerCase()}</p>
            <p className="mt-1 text-xs text-ud-faint">
              Import your existing contacts or add a few to get started. You can always add more later.
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex border-b border-white/10">
            {(["manual", "upload"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setContactMode(mode);
                  setUploadStep("file");
                  setStepError(null);
                }}
                className={`pb-2 pr-4 text-sm font-medium border-b-2 transition-colors ${
                  contactMode === mode ? activeTab : inactiveTab
                }`}
              >
                {mode === "manual" ? "Add manually" : "Upload file"}
              </button>
            ))}
          </div>

          {/* Manual entry */}
          {contactMode === "manual" && (
            <div className="space-y-2">
              {manualRows.map((row, i) => (
                <div key={i} className="flex flex-wrap gap-2">
                  <input
                    placeholder="Name"
                    value={row.name}
                    onChange={(e) => {
                      const updated = [...manualRows];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setManualRows(updated);
                    }}
                    className="w-full rounded-[10px] border border-white/10 bg-ud-surface px-3 py-2.5 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 placeholder:text-ud-faint sm:w-auto sm:flex-1"
                  />
                  <input
                    placeholder="Phone"
                    value={row.phone}
                    onChange={(e) => {
                      const updated = [...manualRows];
                      updated[i] = { ...updated[i], phone: e.target.value };
                      setManualRows(updated);
                    }}
                    className="min-w-0 flex-1 rounded-[10px] border border-white/10 bg-ud-surface px-3 py-2.5 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 placeholder:text-ud-faint sm:flex-none sm:w-28"
                  />
                  <input
                    placeholder="Email"
                    value={row.email}
                    onChange={(e) => {
                      const updated = [...manualRows];
                      updated[i] = { ...updated[i], email: e.target.value };
                      setManualRows(updated);
                    }}
                    className="min-w-0 flex-1 rounded-[10px] border border-white/10 bg-ud-surface px-3 py-2.5 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 placeholder:text-ud-faint sm:flex-none sm:w-36"
                  />
                  {manualRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setManualRows(manualRows.filter((_, j) => j !== i))}
                      className="flex h-10 w-9 items-center justify-center text-ud-faint hover:text-red-400"
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

          {/* File upload import */}
          {contactMode === "upload" && uploadStep === "file" && (
            <div className="space-y-3">
              <p className="text-xs text-ud-faint">
                CSV, TSV, Excel, ODS, or Apple Numbers — up to 500 contacts.
              </p>
              <input
                type="file"
                accept={acceptedFileExtensions()}
                disabled={uploadLoading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void analyzeUpload(f);
                }}
                className="w-full rounded-[10px] border border-white/10 bg-ud-surface px-3 py-2.5 text-sm text-ud-muted outline-none file:mr-3 file:rounded-[7px] file:border-0 file:bg-ud-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white disabled:opacity-60"
              />
              {uploadLoading && (
                <p className="flex items-center gap-2 text-xs text-ud-faint">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ud-accent border-t-transparent" />
                  Analyzing file…
                </p>
              )}
            </div>
          )}

          {contactMode === "upload" && uploadStep === "mapping" && (
            <ColumnMapper
              headers={uploadHeaders}
              mapping={uploadMapping}
              recordType="relationships"
              onConfirm={handleUploadMappingConfirm}
              onBack={() => { setUploadStep("file"); setStepError(null); }}
              busy={isPending}
            />
          )}

          {stepError && <ErrorBox message={stepError} />}

          {/* Only show Continue/Skip when not in mapping sub-step */}
          {(contactMode === "manual" || (contactMode === "upload" && uploadStep === "file")) && (
            <>
              {contactMode === "manual" && (
                <button type="button" disabled={isPending} onClick={handleStep2} className={BTN_PRIMARY}>
                  {isPending ? "Saving…" : "Continue →"}
                </button>
              )}
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
            </>
          )}
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
            <p className="text-sm font-medium text-ud-ink">Log your first {getIndustryProfile(sector).labels.jobSingular.toLowerCase()}</p>
            <p className="mt-1 text-xs text-ud-faint">
              Add a recent or upcoming {getIndustryProfile(sector).labels.jobSingular.toLowerCase()} so your dashboard has something to work with.
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
            <p className="text-sm font-medium text-ud-ink">Schedule a follow-up</p>
            <p className="mt-1 text-xs text-ud-faint">
              Is there a {getIndustryProfile(sector).labels.customerSingular.toLowerCase()} you&apos;ve been meaning to check in with?
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
        <p className="text-[15px] font-semibold text-ud-ink">Building your workspace…</p>
        <p className="mt-2 text-sm text-ud-faint">
          We&apos;re generating your first operating brief using the data you just entered.
        </p>
      </div>
    </>
  );
}
