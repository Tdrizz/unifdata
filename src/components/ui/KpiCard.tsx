import { cn } from "@/lib/utils";

type DeltaTone = "up" | "down" | "flat";

type Props = {
  label: string;
  value: string | number;
  helper?: string;
  hint?: string;
  delta?: string;
  deltaTone?: DeltaTone;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
};

const deltaToneClasses: Record<DeltaTone, string> = {
  up:   "bg-[#eef5ec] text-ud-success",
  down: "bg-[#fbeded] text-ud-danger",
  flat: "bg-ud-surface-sunk text-ud-muted",
};

export function KpiCard({
  label,
  value,
  helper,
  hint,
  delta,
  deltaTone = "flat",
  compact,
  onClick,
  className,
}: Props) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-ud-surface border border-ud rounded-[12px] shadow-ud",
        compact ? "px-4 py-3" : "px-4 py-4",
        onClick && "cursor-pointer hover:border-ud-hard transition-colors",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-ud-muted leading-tight">{label}</p>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-[2px] rounded-[5px] text-[10.5px] font-bold leading-none",
              deltaToneClasses[deltaTone],
            )}
          >
            {delta}
          </span>
        )}
      </div>
      <p
        className={cn(
          "udv2-num font-semibold tracking-[-0.025em] text-ud-ink mt-1",
          compact ? "text-xl" : "text-2xl",
        )}
      >
        {value}
      </p>
      {(helper || hint) && (
        <p className="text-[11.5px] text-ud-muted mt-1 flex items-center gap-1">
          {helper}
          {hint && (
            <>
              <span className="text-ud-faint">·</span>
              <span className="text-ud-faint">{hint}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
