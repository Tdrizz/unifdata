"use client";

import { useState, useTransition } from "react";
import { updatePreferencesAction } from "../actions";

type Props = {
  autopilot: boolean;
  aiFirstMode: boolean;
  isPro: boolean;
};

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? "bg-ud-accent" : "bg-[rgba(0,0,0,0.12)]"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-[18px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function AiSettingsToggles({ autopilot, aiFirstMode, isPro }: Props) {
  const [autopilotEnabled, setAutopilotEnabled] = useState(autopilot);
  const [aiFirstEnabled, setAiFirstEnabled] = useState(aiFirstMode);
  const [confirmingAutopilot, setConfirmingAutopilot] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAutopilotToggle(value: boolean) {
    if (value && !confirmingAutopilot) {
      setConfirmingAutopilot(true);
      return;
    }
    setConfirmingAutopilot(false);
    setAutopilotEnabled(value);
    startTransition(() => {
      updatePreferencesAction("autopilot", value).catch(() => {
        setAutopilotEnabled(!value);
      });
    });
  }

  function handleAiFirstToggle(value: boolean) {
    setAiFirstEnabled(value);
    startTransition(() => {
      updatePreferencesAction("ai_first_mode", value).catch(() => {
        setAiFirstEnabled(!value);
      });
    });
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Autopilot */}
      <div className="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.04)] gap-4">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-ud-ink">Autopilot mode</p>
          <p className="text-[12px] text-ud-muted mt-[1px]">
            Routine outreach and data fixes execute automatically without approval. Only available on Pro.
          </p>
          {confirmingAutopilot && (
            <div className="mt-2 p-3 rounded-[8px] border border-[rgba(234,179,8,0.3)] bg-[rgba(234,179,8,0.06)] text-[12px] text-ud-ink">
              <p className="font-semibold mb-2">Enable autopilot?</p>
              <p className="text-ud-muted mb-3">Routine outreach reminders and data reconciliation will execute automatically without your approval. Destructive actions always require manual review.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1.5 rounded-[7px] bg-ud-accent text-white text-[12px] font-semibold hover:opacity-90 transition-opacity"
                  onClick={() => handleAutopilotToggle(true)}
                  disabled={pending}
                >
                  Enable autopilot
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1.5 rounded-[7px] border border-ud text-ud-muted text-[12px] font-semibold hover:text-ud-ink transition-colors"
                  onClick={() => setConfirmingAutopilot(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        {!confirmingAutopilot && (
          <Toggle
            enabled={autopilotEnabled}
            onChange={handleAutopilotToggle}
            disabled={!isPro || pending}
          />
        )}
      </div>

      {/* AI-first mode */}
      <div className="flex items-center justify-between py-3 gap-4">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-ud-ink">AI-first mode</p>
          <p className="text-[12px] text-ud-muted mt-[1px]">
            Open the AI assistant instead of Today's dashboard when you sign in.
          </p>
        </div>
        <Toggle enabled={aiFirstEnabled} onChange={handleAiFirstToggle} disabled={pending} />
      </div>
    </div>
  );
}
