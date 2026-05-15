import { cn } from "@/lib/utils";

type Tone = "default" | "danger" | "success" | "warning" | "info";

type Item = {
  label: string;
  value: string | number;
  helper?: string;
  tone?: Tone;
};

type Props = {
  items: Item[];
  className?: string;
};

const toneValueClass: Record<Tone, string> = {
  default: "text-ud-ink",
  danger:  "text-ud-danger",
  success: "text-ud-success",
  warning: "text-ud-warning",
  info:    "text-ud-info",
};

export function StatStrip({ items, className }: Props) {
  return (
    <div
      className={cn(
        "flex divide-x bg-ud-surface border border-ud rounded-[12px] shadow-ud overflow-hidden",
        className,
      )}
      style={{ "--tw-divide-opacity": "1" } as React.CSSProperties}
    >
      {items.map((item, i) => (
        <div key={i} className="flex-1 px-[14px] py-[14px] border-ud-soft">
          <p className="text-[11px] font-medium text-ud-muted leading-tight">{item.label}</p>
          <p
            className={cn(
              "udv2-num text-xl font-semibold tracking-[-0.025em] mt-0.5",
              toneValueClass[item.tone ?? "default"],
            )}
          >
            {item.value}
          </p>
          {item.helper && (
            <p className="text-[11px] text-ud-faint mt-0.5">{item.helper}</p>
          )}
        </div>
      ))}
    </div>
  );
}
