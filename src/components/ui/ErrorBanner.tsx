import { cn } from "@/lib/utils";

type Tone = "error" | "warning" | "info";

const toneStyles: Record<Tone, string> = {
  error: "bg-red-50 border-red-200 text-red-700",
  warning: "bg-amber-50 border-amber-200 text-amber-700",
  info: "bg-blue-50 border-blue-200 text-blue-700",
};

export function ErrorBanner({
  message,
  tone = "error",
  className,
}: {
  message: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-[10px] rounded-[10px] border px-[16px] py-[12px] text-[13.5px] leading-[1.5]",
        toneStyles[tone],
        className,
      )}
      role="alert"
    >
      {/* Icon */}
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        className="mt-[1px] shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
