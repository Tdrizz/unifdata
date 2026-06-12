"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";

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
];

const ACTION_OPTIONS = [
  { value: "add_tag", label: "Add tag" },
  { value: "remove_tag", label: "Remove tag" },
  { value: "set_status", label: "Set contact status" },
  { value: "send_sms", label: "Send SMS" },
  { value: "create_task", label: "Create task" },
  { value: "notify_owner", label: "Notify owner" },
  { value: "request_ai_outreach", label: "Request AI outreach" },
];

function NewAutomationBuilder({
  onCreated,
  onClose,
}: {
  onCreated: (a: Automation) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("trigger");
  const [triggerType, setTriggerType] = useState("contact_created");
  const [actionType, setActionType] = useState("add_tag");
  const [actionValue, setActionValue] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const steps: Step[] = ["trigger", "conditions", "actions", "name"];
  const stepIdx = steps.indexOf(step);

  function handleCreate() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    startTransition(async () => {
      const action: Record<string, string> = { type: actionType };
      if (actionType === "add_tag" || actionType === "remove_tag") action.tag_name = actionValue;
      else if (actionType === "set_status") action.status = actionValue;
      else if (actionType === "send_sms") action.message = actionValue;
      else if (actionType === "create_task") action.task_title = actionValue;

      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          trigger_type: triggerType,
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
          </div>
        )}

        {step === "conditions" && (
          <div>
            <h2 className="text-[15px] font-bold text-ud-ink mb-3">Conditions</h2>
            <p className="text-[13px] text-ud-muted">
              No conditions — this automation runs for every contact that matches the trigger.
              Each automation runs at most once per contact every 24 hours.
            </p>
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
              {["add_tag", "remove_tag", "set_status", "send_sms", "create_task", "notify_owner"].includes(actionType) && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-1">
                    {actionType === "add_tag" || actionType === "remove_tag" ? "Tag name" :
                     actionType === "set_status" ? "Status value" :
                     actionType === "send_sms" ? "Message" :
                     actionType === "create_task" ? "Task title" : "Message"}
                  </label>
                  <input
                    type="text"
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    placeholder={actionType === "set_status" ? "e.g. active, inactive, closed" : ""}
                    className="w-full px-3 py-2 bg-transparent border border-ud rounded-[8px] text-[13px] text-ud-ink outline-none focus:border-ud-accent"
                    style={{ fontFamily: "var(--font)" }}
                  />
                </div>
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

export function AutomationsClient({ automations: initialAutomations }: { automations: Automation[] }) {
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations);
  const [showBuilder, setShowBuilder] = useState(false);

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
      <Card padding={16} radius="md" className="mb-6 border-ud-accent/20 bg-ud-accent/5">
        <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-ud-accent mb-1">Early Access</p>
        <p className="text-[13px] text-ud-muted">Automations are in early access. Rules you create now will run once this feature is fully enabled.</p>
      </Card>
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
              automations.map((automation) => (
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
                    {automation.run_count.toLocaleString()}
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showBuilder && (
        <NewAutomationBuilder
          onCreated={(a) => setAutomations((prev) => [a, ...prev])}
          onClose={() => setShowBuilder(false)}
        />
      )}
    </div>
    </>
  );
}
