"use client";

import { useState, useTransition } from "react";

type Stage = {
  id: string;
  name: string;
  position: number;
  color: string;
  stage_type: string;
};

type Contact = {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type ProcessRecord = {
  id: string;
  name: string;
  value: number | null;
  target_date: string | null;
  status: string;
  stage_id: string;
  contact_id: string;
  created_at: string;
  contact?: Contact | null;
};

type Board = {
  id: string;
  name: string;
};

type Props = {
  board: Board | null;
  stages: Stage[];
  records: ProcessRecord[];
  orgId: string;
};

function daysInStage(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

function daysColor(days: number): string {
  if (days < 7) return "#22C55E";
  if (days < 14) return "#F59E0B";
  return "#EF4444";
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function getContactName(record: ProcessRecord): string {
  const c = record.contact;
  if (!c) return "Unknown";
  if (c.name) return c.name;
  return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unknown";
}

function NewRecordForm({
  boardId,
  orgId,
  stages,
  onCreated,
  onClose,
}: {
  boardId: string;
  orgId: string;
  stages: Stage[];
  onCreated: (record: ProcessRecord) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [contactId, setContactId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !stageId || !contactId) {
      setError("Name, stage, and contact are required.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/process/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId,
          orgId,
          stageId,
          contactId,
          name: name.trim(),
          value: value ? Number(value) : null,
        }),
      });
      if (!res.ok) {
        setError("Failed to create record.");
        return;
      }
      const record = await res.json();
      onCreated(record);
      onClose();
    });
  }

  async function searchContacts(q: string) {
    if (q.length < 2) return;
    setContactSearch(q);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-ud-surface border border-ud rounded-[14px] p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[16px] font-bold text-ud-ink mb-4">New Record</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-1">
              Record name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website redesign"
              className="w-full px-3 py-2 bg-transparent border border-ud rounded-[8px] text-[13px] text-ud-ink outline-none focus:border-ud-accent"
              style={{ fontFamily: "var(--font)" }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-1">
              Stage
            </label>
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="w-full px-3 py-2 bg-ud-surface border border-ud rounded-[8px] text-[13px] text-ud-ink outline-none focus:border-ud-accent"
            >
              {stages
                .filter((s) => s.stage_type === "active" || s.stage_type === "on_hold")
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-1">
              Contact ID
            </label>
            <input
              type="text"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              placeholder="Paste contact UUID"
              className="w-full px-3 py-2 bg-transparent border border-ud rounded-[8px] text-[13px] text-ud-ink outline-none focus:border-ud-accent font-mono text-[11px]"
            />
            <p className="text-[11px] text-ud-faint mt-1">Find contact IDs on the Contacts page.</p>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-1">
              Value (optional)
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-transparent border border-ud rounded-[8px] text-[13px] text-ud-ink outline-none focus:border-ud-accent"
            />
          </div>
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 bg-ud-surface border border-ud text-[13px] font-medium text-ud-muted rounded-[8px] hover:text-ud-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-3 py-2 bg-ud-accent text-white text-[13px] font-semibold rounded-[8px] hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordCard({
  record,
  stages,
  onStageChange,
}: {
  record: ProcessRecord;
  stages: Stage[];
  onStageChange: (recordId: string, newStageId: string) => void;
}) {
  const [showMove, setShowMove] = useState(false);
  const days = daysInStage(record.created_at);
  const color = daysColor(days);
  const contactName = getContactName(record);

  return (
    <div className="bg-ud-surface border border-ud rounded-[10px] p-3 shadow-sm hover:border-ud-hard transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ud-ink truncate">{record.name}</div>
          <div className="text-[11px] text-ud-muted truncate">{contactName}</div>
        </div>
        {record.value != null && record.value > 0 && (
          <div className="text-[12px] font-semibold text-ud-ink shrink-0">
            {formatCurrency(record.value)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] text-white"
          style={{ backgroundColor: color }}
        >
          {days}d
        </span>

        <div className="relative">
          <button
            onClick={() => setShowMove(!showMove)}
            className="text-[11px] text-ud-faint hover:text-ud-accent transition-colors px-1.5 py-0.5 rounded-[4px] hover:bg-ud-surface-sunk"
          >
            Move ▾
          </button>
          {showMove && (
            <div className="absolute right-0 bottom-full mb-1 bg-ud-surface border border-ud rounded-[8px] shadow-xl z-10 min-w-[140px] overflow-hidden">
              {stages.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    onStageChange(record.id, s.id);
                    setShowMove(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-[12px] text-ud-ink hover:bg-ud-surface-sunk transition-colors"
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProcessBoardClient({ board, stages, records: initialRecords, orgId }: Props) {
  const [records, setRecords] = useState<ProcessRecord[]>(initialRecords);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  const activeStages = stages.filter(
    (s) => s.stage_type === "active" || s.stage_type === "on_hold"
  );
  const terminalStages = stages.filter(
    (s) => s.stage_type === "completed" || s.stage_type === "cancelled"
  );
  const visibleStages = showTerminal ? stages : activeStages;

  async function handleStageChange(recordId: string, newStageId: string) {
    const stage = stages.find((s) => s.id === newStageId);
    const newStatus =
      stage?.stage_type === "completed"
        ? "completed"
        : stage?.stage_type === "cancelled"
        ? "cancelled"
        : stage?.stage_type === "on_hold"
        ? "on_hold"
        : "active";

    const res = await fetch(`/api/process/records/${recordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId: newStageId, status: newStatus }),
    });

    if (res.ok) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId ? { ...r, stage_id: newStageId, status: newStatus } : r
        )
      );
    }
  }

  function handleRecordCreated(record: ProcessRecord) {
    setRecords((prev) => [record, ...prev]);
  }

  if (!board) {
    return (
      <div className="hidden md:flex flex-col items-center justify-center h-full text-center px-7 pt-7">
        <div className="text-[22px] font-bold text-ud-ink mb-2">No board set up yet</div>
        <p className="text-[13px] text-ud-muted">
          Create your first board and stages in Settings.
        </p>
      </div>
    );
  }

  return (
    <div className="hidden md:flex flex-col h-full px-7 pt-7 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-0.5">
            Process Board
          </div>
          <h1 className="text-[22px] font-bold text-ud-ink">{board.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className="px-3 py-2 text-[12px] font-medium bg-ud-surface border border-ud rounded-[8px] text-ud-muted hover:text-ud-ink transition-colors"
          >
            {showTerminal ? "Hide closed" : `Show closed (${terminalStages.length})`}
          </button>
          <button
            onClick={() => setShowNewForm(true)}
            className="px-3 py-2 text-[12px] font-semibold bg-ud-accent text-white rounded-[8px] hover:opacity-90 transition-opacity"
          >
            + New Record
          </button>
        </div>
      </div>

      {/* Board columns */}
      <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
        {visibleStages.map((stage) => {
          const stageRecords = records.filter((r) => r.stage_id === stage.id && r.status !== "cancelled" && r.status !== "completed");
          const terminalRecords = records.filter(
            (r) =>
              r.stage_id === stage.id &&
              (r.status === "cancelled" || r.status === "completed")
          );
          const displayRecords =
            stage.stage_type === "completed" || stage.stage_type === "cancelled"
              ? [...stageRecords, ...terminalRecords]
              : stageRecords;

          return (
            <div key={stage.id} className="flex-shrink-0 w-[260px] flex flex-col">
              {/* Stage header */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-[12px] font-semibold text-ud-ink uppercase tracking-[0.05em]">
                  {stage.name}
                </span>
                <span className="ml-auto text-[11px] text-ud-faint bg-ud-surface-sunk px-1.5 py-0.5 rounded-[4px]">
                  {displayRecords.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 bg-ud-surface-sunk rounded-[10px] p-2 min-h-[100px]">
                {displayRecords.length === 0 && (
                  <div className="py-4 text-center text-[11px] text-ud-faint">Empty</div>
                )}
                {displayRecords.map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    stages={stages}
                    onStageChange={handleStageChange}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showNewForm && (
        <NewRecordForm
          boardId={board.id}
          orgId={orgId}
          stages={stages}
          onCreated={handleRecordCreated}
          onClose={() => setShowNewForm(false)}
        />
      )}
    </div>
  );
}
