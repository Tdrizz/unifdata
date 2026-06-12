"use client";

import { useState, useTransition } from "react";

function MobileDesktopNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="md:hidden flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-12 h-12 rounded-[14px] bg-ud-surface border border-ud flex items-center justify-center mb-4">
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="text-ud-muted">
          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
        </svg>
      </div>
      <p className="text-[15px] font-semibold text-ud-ink mb-1">{title}</p>
      <p className="text-[13px] text-ud-muted max-w-[240px]">{description}</p>
    </div>
  );
}

type Automation = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: string;
  run_count: number;
  last_triggered: string | null;
  created_at: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function triggerLabel(type: string): string {
  const labels: Record<string, string> = {
    contact_created: "Contact created",
    status_changed: "Status changed",
    tag_added: "Tag added",
    record_created: "Record created",
    record_completed: "Record completed",
    message_received: "Message received",
    days_inactive: "Days inactive",
    manual: "Manual trigger",
  };
  return labels[type] ?? type;
}

type Step = "trigger" | "conditions" | "actions" | "name";

const TRIGGER_OPTIONS = [
  { value: "contact_created", label: "Contact created" },
  { value: "status_changed", label: "Contact status changed" },
  { value: "tag_added", label: "Tag added" },
  { value: "record_created", label: "Record created" },
  { value: "record_completed", label: "Record completed" },
  { value: "message_received", label: "Message received" },
  { value: "days_inactive", label: "Contact inactive for N days" },
];

const ACTION_OPTIONS = [
  { value: "add_tag", label: "Add tag" },
  { value: "remove_tag", label: "Remove tag" },
  { value: "set_status", label: "Set contact status" },
  { value: "send_sms", label: "Send SMS" },
  { value: "create_task", label: "Create follow-up task" },
  { value: "create_record", label: "Create board record" },
  { value: "notify_owner", label: "Notify owner" },
  { value: "request_ai_outreach", label: "Request AI outreach" },
];

type BoardOption = { id: string; name: string; stages: Array<{ id: string; name: string }> };

type ConditionDraft = { field: string; operator: string; value: string };

const CONDITION_FIELDS = [
  { value: "relationship_status", label: "Contact status" },
  { value: "tag", label: "Tag" },
  { value: "source", label: "Source" },
  { value: "primary_email", label: "Email" },
  { value: "primary_phone", label: "Phone" },
];

const CONDITION_OPERATORS = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "is_blank", label: "is blank" },
  { value: "is_not_blank", label: "is not blank" },
];

const VALUELESS_OPERATORS = new Set(["is_blank", "is_not_blank"]);

function NewAutomationBuilder({
  boards,
  onCreated,
  onClose,
}: {
  boards: BoardOption[];
  onCreated: (a: Automation) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("trigger");
  const [triggerType, setTriggerType] = useState("contact_created");
  const [inactiveDays, setInactiveDays] = useState("30");
  const [conditions, setConditions] = useState<ConditionDraft[]>([]);
  const [actionType, setActionType] = useState("add_tag");
  const [actionValue, setActionValue] = useState("");
  const [dueInDays, setDueInDays] = useState("3");
  const [boardId, setBoardId] = useState("");
  const [stageId, setStageId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const steps: Step[] = ["trigger", "conditions", "actions", "name"];
  const stepIdx = steps.indexOf(step);
  const selectedBoard = boards.find((b) => b.id === boardId) ?? null;

  function handleCreate() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (actionType === "create_record" && (!boardId || !stageId)) {
      setError("Choose a board and stage for the new record.");
      return;
    }
    startTransition(async () => {
      const action: Record<string, string> = { type: actionType };
      if (actionType === "add_tag" || actionType === "remove_tag") action.tag_name = actionValue;
      else if (actionType === "set_status") action.status = actionValue;
      else if (actionType === "send_sms") action.message = actionValue;
      else if (actionType === "create_task") {
        action.task_title = actionValue;
        action.due_in_days = dueInDays || "3";
      } else if (actionType === "create_record") {
        action.board_id = boardId;
        action.stage_id = stageId;
        action.record_name = actionValue;
      }

      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          trigger_type: triggerType,
          trigger_config:
            triggerType === "days_inactive"
              ? { days: Math.min(Math.max(Number(inactiveDays) || 30, 1), 730) }
              : {},
          conditions: conditions.filter(
            (c) => VALUELESS_OPERATORS.has(c.operator) || c.value.trim() !== ""
          ),
          actions: [action],
        }),
      });
      if (!res.ok) {
        setError("Failed to create automation.");
        return;
      }
      const automation = await res.json();
      onCreated(automation);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-ud-surface border border-ud rounded-[14px] p-6 w-full max-w-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  i <= stepIdx ? "bg-ud-accent text-white" : "bg-ud-surface-sunk text-ud-faint"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-[12px] capitalize ${i === stepIdx ? "font-semibold text-ud-ink" : "text-ud-faint"}`}>
                {s}
              </span>
              {i < steps.length - 1 && <span className="text-ud-faint">›</span>}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === "trigger" && (
          <div>
            <h2 className="text-[15px] font-bold text-ud-ink mb-3">Choose trigger</h2>
            <div className="space-y-1.5">
              {TRIGGER_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="trigger"
                    value={opt.value}
                    checked={triggerType === opt.value}
                    onChange={() => setTriggerType(opt.value)}
                    className="accent-ud-accent"
                  />
                  <span className="text-[13px] text-ud-ink">{opt.label}</span>
                </label>
              ))}
            </div>
            {triggerType === "days_inactive" && (
              <div className="mt-3">
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-1">
                  Days without activity
                </label>
                <input
                  type="number"
                  min={1}
                  max={730}
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(e.target.value)}
                  className="w-32 px-3 py-2 bg-transparent border border-ud rounded-[8px] text-[13px] text-ud-ink outline-none focus:border-ud-accent"
                />
                <p className="mt-1.5 text-[11px] text-ud-faint">
                  Checked once a day. Fires once per contact when they pass this many days without any logged activity.
                </p>
              </div>
            )}
          </div>
        )}

        {step === "conditions" && (
          <div>
            <h2 className="text-[15px] font-bold text-ud-ink mb-3">Conditions</h2>
            <p className="text-[12px] text-ud-muted mb-3">
              {conditions.length === 0
                ? "No conditions — this automation runs for every contact that matches the trigger."
                : "All conditions must match for the automation to run."}{" "}
              Each automation runs at most once per contact every 24 hours.
            </p>
            <div className="space-y-2">
              {conditions.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={c.field}
                    onChange={(e) =>
                      setConditions((prev) => prev.map((p, j) => (j === i ? { ...p, field: e.target.value } : p)))
                    }
                    className="flex-1 px-2 py-2 bg-ud-surface border border-ud rounded-[8px] text-[12px] text-ud-ink outline-none"
                  >
                    {CONDITION_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <select
                    value={c.operator}
                    onChange={(e) =>
                      setConditions((prev) => prev.map((p, j) => (j === i ? { ...p, operator: e.target.value } : p)))
                    }
                    className="w-28 px-2 py-2 bg-ud-surface border border-ud rounded-[8px] text-[12px] text-ud-ink outline-none"
                  >
                    {(c.field === "tag"
                      ? CONDITION_OPERATORS.filter((o) => o.value === "is" || o.value === "is_not")
                      : CONDITION_OPERATORS
                    ).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {!VALUELESS_OPERATORS.has(c.operator) && (
                    <input
                      type="text"
                      value={c.value}
                      onChange={(e) =>
                        setConditions((prev) => prev.map((p, j) => (j === i ? { ...p, value: e.target.value } : p)))
                      }
                      placeholder="Value"
                      className="flex-1 px-2 py-2 bg-transparent border border-ud rounded-[8px] text-[12px] text-ud-ink outline-none focus:border-ud-accent"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setConditions((prev) => prev.filter((_, j) => j !== i))}
                    className="text-ud-muted hover:text-red-500 text-[13px] px-1"
                    aria-label="Remove condition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setConditions((prev) => [...prev, { field: "relationship_status", operator: "is", value: "" }])
              }
              className="mt-3 text-[12px] font-semibold text-ud-accent hover:underline"
            >
              + Add condition
            </button>
          </div>
        )}

        {step === "actions" && (
          <div>
            <h2 className="text-[15px] font-bold text-ud-ink mb-3">Action</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-1">
                  Action type
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full px-3 py-2 bg-ud-surface border border-ud rounded-[8px] text-[13px] text-ud-ink outline-none"
                >
                  {ACTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {["add_tag", "remove_tag", "set_status", "send_sms", "create_task", "create_record", "notify_owner"].includes(actionType) && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-1">
                    {actionType === "add_tag" || actionType === "remove_tag" ? "Tag name" :
                     actionType === "set_status" ? "Status value" :
                     actionType === "send_sms" ? "Message" :
                     actionType === "create_task" ? "Task title" :
                     actionType === "create_record" ? "Record name (optional)" : "Message"}
                  </label>
                  <input
                    type="text"
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    placeholder={
                      actionType === "set_status" ? "e.g. active, inactive, closed" :
                      actionType === "create_record" ? "Defaults to the contact's name" : ""
                    }
                    className="w-full px-3 py-2 bg-transparent border border-ud rounded-[8px] text-[13px] text-ud-ink outline-none focus:border-ud-accent"
                    style={{ fontFamily: "var(--font)" }}
                  />
                </div>
              )}
              {actionType === "create_task" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-1">
                    Due in (days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={dueInDays}
                    onChange={(e) => setDueInDays(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-ud rounded-[8px] text-[13px] text-ud-ink outline-none focus:border-ud-accent"
                  />
                </div>
              )}
              {actionType === "create_record" && (
                boards.length === 0 ? (
                  <p className="text-[12px] text-ud-muted">
                    No process boards yet — create one in Settings first.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-1">
                        Board
                      </label>
                      <select
                        value={boardId}
                        onChange={(e) => { setBoardId(e.target.value); setStageId(""); }}
                        className="w-full px-3 py-2 bg-ud-surface border border-ud rounded-[8px] text-[13px] text-ud-ink outline-none"
                      >
                        <option value="">Choose…</option>
                        {boards.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-1">
                        Stage
                      </label>
                      <select
                        value={stageId}
                        onChange={(e) => setStageId(e.target.value)}
                        disabled={!selectedBoard}
                        className="w-full px-3 py-2 bg-ud-surface border border-ud rounded-[8px] text-[13px] text-ud-ink outline-none disabled:opacity-50"
                      >
                        <option value="">Choose…</option>
                        {(selectedBoard?.stages ?? []).map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {step === "name" && (
          <div className="space-y-3">
            <h2 className="text-[15px] font-bold text-ud-ink mb-3">Name your automation</h2>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Welcome new contacts"
                className="w-full px-3 py-2 bg-transparent border border-ud rounded-[8px] text-[13px] text-ud-ink outline-none focus:border-ud-accent"
                style={{ fontFamily: "var(--font)" }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-transparent border border-ud rounded-[8px] text-[13px] text-ud-ink outline-none focus:border-ud-accent resize-none"
                style={{ fontFamily: "var(--font)" }}
              />
            </div>
            {error && <p className="text-[12px] text-red-500">{error}</p>}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={stepIdx === 0 ? onClose : () => setStep(steps[stepIdx - 1])}
            className="flex-1 px-3 py-2 bg-ud-surface border border-ud text-[13px] font-medium text-ud-muted rounded-[8px] hover:text-ud-ink transition-colors"
          >
            {stepIdx === 0 ? "Cancel" : "Back"}
          </button>
          {stepIdx < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(steps[stepIdx + 1])}
              className="flex-1 px-3 py-2 bg-ud-accent text-white text-[13px] font-semibold rounded-[8px] hover:opacity-90 transition-opacity"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending}
              className="flex-1 px-3 py-2 bg-ud-accent text-white text-[13px] font-semibold rounded-[8px] hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {isPending ? "Creating…" : "Create automation"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type RunRow = {
  id: string;
  automation_id: string;
  triggered_by: string;
  status: string;
  error: string | null;
  run_at: string;
};

export function AutomationsClient({
  automations: initialAutomations,
  boards = [],
  runs = [],
}: {
  automations: Automation[];
  boards?: BoardOption[];
  runs?: RunRow[];
}) {
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations);
  const [showBuilder, setShowBuilder] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const runsByAutomation = new Map<string, RunRow[]>();
  for (const run of runs) {
    const list = runsByAutomation.get(run.automation_id) ?? [];
    if (list.length < 10) list.push(run);
    runsByAutomation.set(run.automation_id, list);
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    if (res.ok) {
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: !current } : a))
      );
    }
  }

  return (
    <>
    <MobileDesktopNotice title="Automations" description="Manage your automation rules on desktop for the full experience." />
    <div className="hidden md:block px-7 pb-10 pt-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-0.5">
            Automations
          </div>
          <h1 className="text-[22px] font-bold text-ud-ink">Automation rules</h1>
          <p className="text-[13px] text-ud-muted mt-0.5">
            {automations.length} automation{automations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="px-3 py-2 bg-ud-accent text-white text-[13px] font-semibold rounded-[9px] hover:opacity-90 transition-opacity"
        >
          + New automation
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[10px] border border-[rgba(0,0,0,0.06)] shadow-ud">
        <table className="w-full border-collapse bg-ud-surface">
          <thead>
            <tr>
              {["Name", "Trigger", "Last triggered", "Runs", "Active"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-[10px] text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint bg-[rgba(0,0,0,0.015)] border-b border-ud whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child_td]:border-b-0 [&_tr:hover_td]:bg-[rgba(0,0,0,0.012)]">
            {automations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-[13px] text-ud-muted text-center">
                  No automations yet. Create one to get started.
                </td>
              </tr>
            ) : (
              automations.flatMap((automation) => {
                const automationRuns = runsByAutomation.get(automation.id) ?? [];
                const isExpanded = expandedId === automation.id;
                const rows = [
                  <tr key={automation.id}>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]">
                      <div className="font-semibold text-ud-ink">{automation.name}</div>
                      {automation.description && (
                        <div className="text-[12px] text-ud-faint truncate max-w-[240px]">
                          {automation.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">
                      {triggerLabel(automation.trigger_type)}
                    </td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">
                      {formatDate(automation.last_triggered)}
                    </td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted [font-variant-numeric:tabular-nums]">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : automation.id)}
                        className="hover:text-ud-ink hover:underline disabled:no-underline"
                        disabled={automationRuns.length === 0}
                        title={automationRuns.length > 0 ? "Show recent runs" : "No runs yet"}
                      >
                        {automation.run_count.toLocaleString()}
                        {automationRuns.length > 0 && (
                          <span className="ml-1 text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]">
                      <button
                        onClick={() => toggleActive(automation.id, automation.is_active)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                          automation.is_active ? "bg-ud-accent" : "bg-ud-surface-sunk border border-ud"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                            automation.is_active ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>,
                ];
                if (isExpanded && automationRuns.length > 0) {
                  rows.push(
                    <tr key={`${automation.id}-runs`}>
                      <td colSpan={5} className="px-4 py-3 border-b border-[rgba(0,0,0,0.04)] bg-[rgba(0,0,0,0.012)]">
                        <div className="space-y-1.5">
                          {automationRuns.map((run) => (
                            <div key={run.id} className="flex items-center gap-3 text-[12px]">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  run.status === "success" ? "bg-green-500" : "bg-red-500"
                                }`}
                              />
                              <span className="text-ud-muted w-36 shrink-0">
                                {new Date(run.run_at).toLocaleString("en-US", {
                                  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                                })}
                              </span>
                              <span className="text-ud-faint">{triggerLabel(run.triggered_by)}</span>
                              {run.error && <span className="text-red-600 truncate">{run.error}</span>}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>,
                  );
                }
                return rows;
              })
            )}
          </tbody>
        </table>
      </div>

      {showBuilder && (
        <NewAutomationBuilder
          boards={boards}
          onCreated={(a) => setAutomations((prev) => [a, ...prev])}
          onClose={() => setShowBuilder(false)}
        />
      )}
    </div>
    </>
  );
}
