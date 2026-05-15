"use client";

import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function Switch({ checked, onChange, disabled, className }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 h-[20px] w-[34px] p-[2px] rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50",
        checked
          ? "bg-ud-accent border-ud-accent"
          : "bg-ud-surface-sunk border-ud",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform duration-150",
          checked ? "translate-x-[14px]" : "translate-x-0",
        )}
      />
    </button>
  );
}
