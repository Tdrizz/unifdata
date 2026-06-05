"use client";

import { useState } from "react";
import { toast } from "sonner";

type Draft = {
  id: string;
  draft_type: string;
  subject?: string | null;
  body: string;
  action_label?: string | null;
  reasoning?: string | null;
  escalation_level?: number | null;
};

type Alert = {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  reasoning?: string | null;
  escalation_level?: number | null;
};

type Props = {
  drafts: Draft[];
  alerts: Alert[];
  isPro: boolean;
};

const severityColors: Record<string, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-700",
  warning: "bg-amber-50 border-amber-200 text-amber-700",
  critical: "bg-red-50 border-red-200 text-red-700",
};

const severityIcon: Record<string, string> = {
  info: "ℹ",
  warning: "⚠",
  critical: "✕",
};

const severityLabel: Record<string, string> = {
  info: "FYI",
  warning: "Heads up",
  critical: "Action needed",
};

function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
  );
}

export function AgentInbox({ drafts: initialDrafts, alerts: initialAlerts, isPro }: Props) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  function startActioning(id: string) {
    setActioningIds((prev) => new Set(prev).add(id));
  }
  function stopActioning(id: string) {
    setActioningIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  if (!isPro) {
    return (
      <div className="mb-5 rounded-[var(--radius-ud-lg)] border border-dashed border-ud bg-ud-surface px-5 py-4">
        <p className="text-[13px] font-semibold text-ud-ink mb-0.5">Upgrade to Pro to unlock the AI Inbox</p>
        <p className="text-[12.5px] text-ud-muted">Pro automatically drafts outreach, flags revenue risks, and reviews your data every night — so you wake up knowing what needs attention.</p>
      </div>
    );
  }

  const total = drafts.length + alerts.length;
  if (total === 0) return null;

  async function approveDraft(id: string) {
    startActioning(id);
    try {
      const res = await fetch(`/api/v1/agent-drafts/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
      }
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve. Try again.");
    } finally {
      stopActioning(id);
    }
  }

  async function dismissDraft(id: string) {
    setDismissingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/v1/agent-drafts/${id}/dismiss`, { method: "POST" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast.error("Failed to dismiss. Try again.");
    } finally {
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function dismissAlert(id: string) {
    setDismissingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/v1/agent-alerts/${id}/dismiss`, { method: "POST" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error("Failed to dismiss. Try again.");
    } finally {
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="mb-5 rounded-[var(--radius-ud-lg)] border border-[rgba(0,0,0,0.06)] bg-ud-surface shadow-ud overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[rgba(0,0,0,0.05)] flex items-center gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.10em] text-ud-accent">AI Inbox</span>
        <span className="inline-flex items-center justify-center rounded-full bg-ud-accent text-white text-[10px] font-bold w-[18px] h-[18px]">{total}</span>
        <p className="text-[12.5px] text-ud-muted ml-1">
          AI flagged {total === 1 ? "1 thing" : `${total} things`} for your review
        </p>
      </div>

      <div className="divide-y divide-[rgba(0,0,0,0.04)]">
        {drafts.map((draft) => {
          const isActioning = actioningIds.has(draft.id);
          const isDismissing = dismissingIds.has(draft.id);
          const approveLabel = draft.draft_type === "outreach_email" || draft.draft_type === "outreach_sms"
            ? "Send"
            : draft.action_label ?? "Approve";
          const escalLevel = draft.escalation_level ?? 0;
          const escalBorder = escalLevel >= 2
            ? "border-l-4 border-l-red-400"
            : escalLevel === 1
            ? "border-l-4 border-l-amber-400"
            : "";
          return (
            <div key={draft.id} className={`px-5 py-4 flex gap-4 items-start ${escalBorder}`}>
              <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-ud-accent/10 flex items-center justify-center text-[12px]">
                {draft.draft_type === "outreach_email" ? "✉" : "💬"}
              </div>
              <div className="flex-1 min-w-0">
                {escalLevel > 0 && (
                  <p className={`text-[10.5px] font-bold uppercase tracking-wide mb-0.5 ${escalLevel >= 2 ? "text-red-500" : "text-amber-500"}`}>
                    Flagged {escalLevel + 1} time{escalLevel + 1 !== 1 ? "s" : ""}
                  </p>
                )}
                {draft.subject && (
                  <p className="text-[12.5px] font-semibold text-ud-ink mb-0.5 truncate">{draft.subject}</p>
                )}
                <p className="text-[12.5px] text-ud-text leading-relaxed line-clamp-3">{draft.body}</p>
                {draft.reasoning && (
                  <p className="mt-1.5 text-[11.5px] text-ud-muted italic">{draft.reasoning}</p>
                )}
              </div>
              <div className="shrink-0 flex gap-1.5">
                <button
                  onClick={() => approveDraft(draft.id)}
                  disabled={isActioning || isDismissing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-ud-ink text-white text-[11.5px] font-semibold hover:opacity-85 transition-opacity disabled:opacity-40"
                >
                  {isActioning ? <><Spinner /> Applying…</> : approveLabel}
                </button>
                <button
                  onClick={() => dismissDraft(draft.id)}
                  disabled={isActioning || isDismissing}
                  className="inline-flex items-center px-2.5 py-1.5 rounded-[7px] border border-ud text-ud-muted text-[11.5px] font-semibold hover:border-ud-hard hover:text-ud-ink transition-colors disabled:opacity-40"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}

        {alerts.map((alert) => {
          const isDismissing = dismissingIds.has(alert.id);
          const escalLevel = alert.escalation_level ?? 0;
          const escalBorder = escalLevel >= 2
            ? "border-l-4 border-l-red-400"
            : escalLevel === 1
            ? "border-l-4 border-l-amber-400"
            : "";
          return (
            <div key={alert.id} className={`px-5 py-4 flex gap-4 items-start ${escalBorder}`}>
              <div className={`shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-[12px] border ${severityColors[alert.severity]}`}>
                {severityIcon[alert.severity]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ud-muted">{severityLabel[alert.severity]}</p>
                  {escalLevel > 0 && (
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${escalLevel >= 2 ? "text-red-500" : "text-amber-500"}`}>
                      · Flagged {escalLevel + 1}×
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] font-semibold text-ud-ink mb-0.5">{alert.title}</p>
                <p className="text-[12.5px] text-ud-text leading-relaxed">{alert.body}</p>
                {alert.reasoning && (
                  <p className="mt-1.5 text-[11.5px] text-ud-muted italic">{alert.reasoning}</p>
                )}
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                disabled={isDismissing}
                className="shrink-0 inline-flex items-center px-2.5 py-1.5 rounded-[7px] border border-ud text-ud-muted text-[11.5px] font-semibold hover:border-ud-hard hover:text-ud-ink transition-colors disabled:opacity-40"
              >
                {isDismissing ? <Spinner /> : "Dismiss"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
