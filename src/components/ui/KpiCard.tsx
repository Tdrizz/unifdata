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
        "h-full flex flex-col bg-ud-surface rounded-[12px]",
        compact ? "px-4 py-3.5" : "px-5 py-5",
        onClick && "cursor-pointer transition-shadow duration-[120ms] hover:shadow-ud-raised",
        className,
      )}
    >
      {/* label/value/helper each pinned to a fixed single line -- with a
          delta badge only on some cards in a row, letting any of these wrap
          independently is what made cards in the same row drift out of
          alignment with each other. Truncating instead keeps every card's
          value sitting on the same baseline no matter what its neighbors show. */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="min-w-0 flex-1 truncate text-[10.5px] font-bold uppercase tracking-[0.1em] text-ud-faint leading-tight">{label}</p>
        {delta && (
          <span className={cn("inline-flex items-center px-1.5 py-[2px] rounded-[5px] text-[10px] font-bold leading-none shrink-0", deltaToneClasses[deltaTone])}>
            {delta}
          </span>
        )}
      </div>
      <p className={cn("udv2-num truncate font-bold tracking-[-0.03em] text-ud-ink", compact ? "text-[22px]" : "text-[28px]")}>
        {value}
      </p>
      {(helper || hint) && (
        <p className="mt-1.5 flex items-center gap-1 truncate text-[11.5px] leading-tight text-ud-muted">
          <span className="truncate">{helper}</span>
          {hint && <><span className="shrink-0 text-ud-faint">·</span><span className="shrink-0 text-ud-faint">{hint}</span></>}
        </p>
      )}
    </div>
  );
}
