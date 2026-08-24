"use client";

import { useState, useTransition } from "react";
import { updatePreferencesAction } from "../actions";

type Props = {
  autopilotDataFixes: boolean;
  autopilotOutreach: boolean;
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

export function AiSettingsToggles({ autopilotDataFixes, autopilotOutreach }: Props) {
  const [dataFixesEnabled, setDataFixesEnabled] = useState(autopilotDataFixes);
  const [outreachEnabled, setOutreachEnabled] = useState(autopilotOutreach);
  const [confirmingOutreach, setConfirmingOutreach] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDataFixesToggle(value: boolean) {
    setDataFixesEnabled(value);
    startTransition(() => {
      updatePreferencesAction("autopilot_data_fixes", value).catch(() => {
        setDataFixesEnabled(!value);
      });
    });
  }

  function handleOutreachToggle(value: boolean) {
    if (value && !confirmingOutreach) {
      setConfirmingOutreach(true);
      return;
    }
    setConfirmingOutreach(false);
    setOutreachEnabled(value);
    startTransition(() => {
      updatePreferencesAction("autopilot_outreach", value).catch(() => {
        setOutreachEnabled(!value);
      });
    });
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Data-fix autopilot */}
      <div className="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.04)] gap-4">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-ud-ink">Auto-fix data issues</p>
          <p className="text-[12px] text-ud-muted mt-[1px]">
            Vera merges obvious duplicates and clears junk records on its own. Only touches your own data — nothing sent to customers. On by default.
          </p>
        </div>
        <Toggle
          enabled={dataFixesEnabled}
          onChange={handleDataFixesToggle}
          disabled={pending}
        />
      </div>

      {/* Outreach autopilot */}
      <div className="flex items-center justify-between py-3 gap-4">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-ud-ink">Auto-send outreach</p>
          <p className="text-[12px] text-ud-muted mt-[1px]">
            Follow-up emails and texts to customers send automatically instead of waiting for your approval.
          </p>
          {confirmingOutreach && (
            <div className="mt-2 p-3 rounded-[8px] border border-[rgba(234,179,8,0.3)] bg-[rgba(234,179,8,0.06)] text-[12px] text-ud-ink">
              <p className="font-semibold mb-2">Enable auto-send?</p>
              <p className="text-ud-muted mb-3">Outreach emails and texts will go out to your customers automatically, with no approval step. You can turn this off any time.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1.5 rounded-[7px] bg-ud-accent text-white text-[12px] font-semibold hover:opacity-90 transition-opacity"
                  onClick={() => handleOutreachToggle(true)}
                  disabled={pending}
                >
                  Enable auto-send
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1.5 rounded-[7px] border border-ud text-ud-muted text-[12px] font-semibold hover:text-ud-ink transition-colors"
                  onClick={() => setConfirmingOutreach(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        {!confirmingOutreach && (
          <Toggle
            enabled={outreachEnabled}
            onChange={handleOutreachToggle}
            disabled={pending}
          />
        )}
      </div>
    </div>
  );
}
