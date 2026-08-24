"use client";

import { useState } from "react";
import Link from "next/link";

export type Draft = {
  id: string;
  draft_type: string;
  subject?: string | null;
  body: string;
  action_label?: string | null;
  reasoning?: string | null;
  escalation_level?: number | null;
  record_id?: string | null;
};

export type Alert = {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  reasoning?: string | null;
  escalation_level?: number | null;
  record_id?: string | null;
};

export function VeraDraftCard({ draft, onApprove, onDismiss, href }: { draft: Draft; onApprove: () => Promise<void>; onDismiss: () => Promise<void>; href?: string }) {
  const [actioning, setActioning] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const label = draft.draft_type === "outreach_email" || draft.draft_type === "outreach_sms" ? "Send" : draft.action_label ?? "Approve";
  const content = (
    <div className="flex-1 min-w-0">
      {draft.subject && <p className="text-[13px] font-semibold text-ud-ink mb-0.5 truncate">{draft.subject}</p>}
      <p className="text-[12.5px] text-ud-text leading-relaxed line-clamp-2">{draft.body}</p>
      {draft.reasoning && <p className="mt-1 text-[11px] text-ud-faint italic">{draft.reasoning}</p>}
    </div>
  );
  return (
    <div className="rounded-[12px] border border-ud bg-ud-surface p-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-ud-accent/10 flex items-center justify-center shrink-0 text-[12px]">
          {draft.draft_type === "outreach_email" ? "✉" : "💬"}
        </div>
        {href ? <Link href={href} className="flex-1 min-w-0">{content}</Link> : content}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={async () => { setActioning(true); await onApprove(); setActioning(false); }} disabled={actioning || dismissing} className="flex-1 rounded-[8px] bg-ud-accent text-white text-[12.5px] font-semibold py-2 hover:opacity-90 transition-opacity disabled:opacity-40">
          {actioning ? "Sending…" : label}
        </button>
        <button onClick={async () => { setDismissing(true); await onDismiss(); setDismissing(false); }} disabled={actioning || dismissing} className="px-4 rounded-[8px] border border-ud text-ud-muted text-[12.5px] font-semibold py-2 hover:border-ud-hard hover:text-ud-ink transition-colors disabled:opacity-40">
          Skip
        </button>
      </div>
    </div>
  );
}

export function VeraAlertCard({ alert, onDismiss, href }: { alert: Alert; onDismiss: () => Promise<void>; href?: string }) {
  const [dismissing, setDismissing] = useState(false);
  const toneClass = alert.severity === "critical"
    ? "border-ud-danger/30 bg-ud-danger-bg/30"
    : alert.severity === "warning"
    ? "border-ud-warning/30 bg-ud-warning-bg/30"
    : "border-ud";
  const content = (
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-semibold text-ud-ink mb-0.5">{alert.title}</p>
      <p className="text-[12.5px] text-ud-text leading-relaxed">{alert.body}</p>
      {alert.reasoning && <p className="mt-1 text-[11px] text-ud-faint italic">{alert.reasoning}</p>}
    </div>
  );
  return (
    <div className={`rounded-[12px] border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        {href ? <Link href={href} className="flex-1 min-w-0">{content}</Link> : content}
        <button onClick={async () => { setDismissing(true); await onDismiss(); setDismissing(false); }} disabled={dismissing} className="shrink-0 text-[12px] font-semibold text-ud-muted hover:text-ud-ink transition-colors disabled:opacity-40 px-2 py-1 rounded-[6px] hover:bg-ud-surface-sunk">
          {dismissing ? "…" : "Got it"}
        </button>
      </div>
    </div>
  );
}
