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
        <div key={key} className="setting-row">
          <div>
            <div className="setting-row-label">{label}</div>
            <div className="setting-row-desc">{desc}</div>
          </div>
          <button
            type="button"
            onClick={() => toggle(key)}
            className={`toggle ${prefs[key] ? "toggle-on" : "toggle-off"}`}
            aria-label={`${prefs[key] ? "Disable" : "Enable"} ${label}`}
          />
        </div>
      ))}
    </>
  );
}
