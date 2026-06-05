const badgeStyles = {
  neutral: "bg-ud-surface-sunk text-ud-muted",
  success: "bg-ud-success-bg text-ud-success",
  warning: "bg-ud-warning-bg text-ud-warning",
  danger: "bg-ud-danger-bg text-ud-danger",
  info: "bg-ud-info-bg text-ud-info",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof badgeStyles;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[6px] px-[9px] py-[3px] text-[11px] font-semibold tracking-[0.01em] whitespace-nowrap ${badgeStyles[tone]}`}
    >
      {children}
    </span>
  );
}
