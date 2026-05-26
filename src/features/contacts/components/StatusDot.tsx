"use client";

const STATUS_COLORS: Record<string, string> = {
  new: "#3B82F6",      // blue
  active: "#22C55E",   // green
  inactive: "#9CA3AF", // gray
  on_hold: "#F59E0B",  // amber
  closed: "#EF4444",   // red
};

export function StatusDot({ status }: { status: string | null }) {
  const color = STATUS_COLORS[status ?? "active"] ?? "#9CA3AF";
  const label = status
    ? status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")
    : "Active";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-[12px] text-ud-muted">{label}</span>
    </span>
  );
}
