"use client";

import { useState, useTransition } from "react";
import { updateNotificationPreference } from "../actions";

type Props = {
  initialPrefs: Record<string, boolean>;
};

const TOGGLES = [
  { key: "overdue_followups", label: "Overdue follow-ups", desc: "Alert when a follow-up passes its due date" },
  { key: "pipeline_activity", label: "New pipeline activity", desc: "Lead status changes and new opportunities" },
  { key: "unpaid_invoices", label: "Unpaid invoices", desc: "Remind me when an invoice goes past due" },
  { key: "ai_brief", label: "AI operating brief", desc: "Daily morning summary from the AI assistant" },
];

export function NotificationToggles({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [, startTransition] = useTransition();

  function toggle(key: string) {
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    startTransition(async () => {
      await updateNotificationPreference(key, next);
    });
  }

  return (
    <>
      {TOGGLES.map(({ key, label, desc }) => (
        <div key={key} className="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.04)] last:border-b-0 gap-4">
          <div>
            <div className="text-[13px] font-medium text-ud-ink">{label}</div>
            <div className="text-[12px] text-ud-muted mt-[1px]">{desc}</div>
          </div>
          <button
            type="button"
            onClick={() => toggle(key)}
            className={`w-9 h-5 rounded-[10px] cursor-pointer shrink-0 transition-colors border-0 ${prefs[key] ? "bg-ud-accent" : "bg-[#d8d3ca]"}`}
            aria-label={`${prefs[key] ? "Disable" : "Enable"} ${label}`}
          />
        </div>
      ))}
    </>
  );
}
