function getInitials(name?: string) {
  if (!name) return "FO";

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
  dark = false,
}: {
  companyName?: string;
  dark?: boolean;
}) {
  const initials = getInitials(companyName);

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-sm">
        {initials}
      </div>

      <div>
        <p
          className={dark ? "font-bold text-white" : "font-bold text-slate-950"}
        >
          FrontierOps
        </p>

        {companyName && (
          <p
            className={
              dark ? "text-xs text-slate-400" : "text-xs text-slate-500"
            }
          >
            {companyName}
          </p>
        )}
      </div>
    </div>
  );
}
