"use client";

import { cn } from "@/lib/utils";

type Option = {
  id: string;
  label: string;
  count?: number;
};

type Props = {
  variant?: "underline" | "segment";
  value: string;
  onChange: (id: string) => void;
  options: Option[];
  className?: string;
};

export function Tabs({ variant = "underline", value, onChange, options, className }: Props) {
  if (variant === "segment") {
    return (
      <div className={cn("inline-flex p-[3px] bg-ud-surface-sunk rounded-[9px] gap-0.5", className)}>
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "px-3 py-1.5 rounded-[7px] text-xs font-semibold transition-[color,background-color,box-shadow] duration-[120ms] ease-out",
                active
                  ? "bg-ud-surface text-ud-ink shadow-ud"
                  : "text-ud-muted hover:text-ud-text",
              )}
            >
              {opt.label}
              {opt.count !== undefined && (
                <span className={cn("ml-1 text-[10px]", active ? "text-ud-muted" : "text-ud-faint")}>
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex gap-0.5 border-b border-ud-soft", className)}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "px-[13px] py-2.5 text-sm font-semibold transition-colors whitespace-nowrap",
              active
                ? "text-ud-ink border-b-2 border-ud-ink -mb-px"
                : "text-ud-muted hover:text-ud-text",
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={cn("ml-1.5 text-[11px] font-medium", active ? "text-ud-muted" : "text-ud-faint")}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
