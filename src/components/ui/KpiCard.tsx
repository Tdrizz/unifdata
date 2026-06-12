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
  up:   "bg-ud-success-bg text-ud-success",
  down: "bg-ud-danger-bg text-ud-danger",
  flat: "bg-ud-surface-sunk text-ud-muted",
};

export function KpiCard({ label, value, helper, hint, delta, deltaTone = "flat", compact, onClick, className }: Props) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-ud-surface rounded-[12px]",
        compact ? "px-4 py-3.5" : "px-5 py-5",
        onClick && "cursor-pointer transition-shadow duration-[120ms] hover:shadow-ud-raised",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ud-faint leading-tight">{label}</p>
        {delta && (
          <span className={cn("inline-flex items-center px-1.5 py-[2px] rounded-[5px] text-[10px] font-bold leading-none shrink-0", deltaToneClasses[deltaTone])}>
            {delta}
          </span>
        )}
      </div>
      <p className={cn("udv2-num font-bold tracking-[-0.03em] text-ud-ink", compact ? "text-[22px]" : "text-[28px]")}>
        {value}
      </p>
      {(helper || hint) && (
        <p className="text-[11.5px] text-ud-muted mt-1.5 flex items-center gap-1 leading-tight">
          {helper}
          {hint && <><span className="text-ud-faint">·</span><span className="text-ud-faint">{hint}</span></>}
        </p>
      )}
    </div>
  );
}
