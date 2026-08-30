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
        compact ? "px-3 py-3" : "px-5 py-5",
        onClick && "cursor-pointer transition-shadow duration-[120ms] hover:shadow-ud-raised",
        className,
      )}
    >
      {/* label/helper wrap onto up to 2 lines instead of truncating -- a
          narrow compact card (three across on mobile) cut off words like
          "Open Pipeline" and "Unpaid Revenue" mid-word, which read as
          broken. Each block reserves a fixed min-height sized for its own
          2-line max instead, so cards in the same row still land on the
          same baseline for the value/helper below even when one card's
          text wraps to 2 lines and its neighbor's doesn't. */}
      <div className="flex items-start justify-between gap-2 mb-2 min-h-[27px]">
        <p className="min-w-0 flex-1 line-clamp-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ud-faint leading-tight">{label}</p>
        {delta && (
          <span className={cn("inline-flex items-center px-1.5 py-[2px] rounded-[5px] text-[10px] font-bold leading-none shrink-0", deltaToneClasses[deltaTone])}>
            {delta}
          </span>
        )}
      </div>
      <p className={cn("udv2-num truncate font-bold tracking-[-0.03em] text-ud-ink", compact ? "text-[19px]" : "text-[28px]")}>
        {value}
      </p>
      {(helper || hint) && (
        <p className="mt-1.5 flex items-start gap-1 min-h-[29px] text-[11.5px] leading-tight text-ud-muted">
          <span className="line-clamp-2">{helper}</span>
          {hint && <><span className="shrink-0 text-ud-faint">·</span><span className="shrink-0 text-ud-faint">{hint}</span></>}
        </p>
      )}
    </div>
  );
}
