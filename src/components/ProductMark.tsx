function getInitials(name?: string) {
  if (!name) {
    return "FO";
  }

  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "FO"
  );
}

export function ProductMark({
  companyName,
  compact = false,
  inverse = false,
}: {
  companyName?: string;
  compact?: boolean;
  inverse?: boolean;
}) {
  const initials = getInitials(companyName);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={
          inverse
            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950 shadow-sm"
            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-sm"
        }
      >
        {initials}
      </div>

      {!compact && (
        <div className="min-w-0">
          <p
            className={
              inverse
                ? "truncate font-black tracking-tight text-white"
                : "truncate font-black tracking-tight text-slate-950"
            }
          >
            FrontierOps
          </p>

          {companyName && (
            <p
              className={
                inverse
                  ? "truncate text-xs font-medium text-slate-400"
                  : "truncate text-xs font-medium text-slate-500"
              }
            >
              {companyName}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
