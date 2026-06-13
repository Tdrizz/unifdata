"use client";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import type { FormEvent } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Ask about your workspace…",
  className,
}: Props) {
  const [recording, setRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  function toggleVoice() {
    const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const SpeechRecognitionCtor: (new () => any) | null =
      (win?.SpeechRecognition as (new () => any)) ?? (win?.webkitSpeechRecognition as (new () => any)) ?? null;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (!SpeechRecognitionCtor) return;

    if (recording) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) onChange(value ? value + " " + transcript : transcript);
    };

    recognition.onend = () => {
      setRecording(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  const hasSpeechApi =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex items-end gap-2 px-[16px] py-[14px] border-t border-ud-soft bg-ud-surface-soft",
        className,
      )}
    >
      <textarea
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit(e as unknown as FormEvent);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 resize-none bg-transparent text-[14px] text-ud-ink placeholder:text-ud-faint outline-none leading-[1.5] min-h-[20px] max-h-[120px] overflow-y-auto"
      />
      {/* Voice input — mobile only, hidden on md+ */}
      {hasSpeechApi && (
        <button
          type="button"
          onClick={toggleVoice}
          disabled={disabled}
          className={cn(
            "md:hidden shrink-0 flex items-center justify-center w-9 h-9 rounded-[9px] border transition-colors",
            recording
              ? "border-red-400 bg-ud-danger-bg text-red-500"
              : "border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard",
          )}
          aria-label={recording ? "Stop recording" : "Voice input"}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      )}
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="shrink-0 flex items-center justify-center w-9 h-9 rounded-[9px] bg-ud-ink text-ud-surface disabled:opacity-40 transition-opacity"
      >
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </form>
  );
}
