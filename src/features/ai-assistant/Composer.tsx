"use client";
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
