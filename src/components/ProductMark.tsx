export function ProductMark({
  companyName,
  compact = false,
  inverse = false,
}: {
  companyName?: string;
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={
          inverse
            ? "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#1D2D3E] shadow-sm"
            : "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-[#1D2D3E] shadow-sm"
        }
      >
        <svg viewBox="0 0 512 512" className="h-10 w-10" aria-hidden="true">
          <rect width="512" height="512" rx="112" fill="#1D2D3E" />

          {/* Gear outer ring */}
          <circle cx="256" cy="256" r="170" fill="none" stroke="#E8EDF2" strokeWidth="26" />

          {/* Gear teeth */}
          <rect x="238" y="64" width="36" height="52" rx="8" fill="#E8EDF2" />
          <rect x="238" y="396" width="36" height="52" rx="8" fill="#E8EDF2" />
          <rect x="64" y="238" width="52" height="36" rx="8" fill="#E8EDF2" />
          <rect x="396" y="238" width="52" height="36" rx="8" fill="#E8EDF2" />
          <rect x="136" y="102" width="36" height="50" rx="8" fill="#E8EDF2" transform="rotate(-45 154 127)" />
          <rect x="340" y="102" width="36" height="50" rx="8" fill="#E8EDF2" transform="rotate(45 358 127)" />
          <rect x="136" y="360" width="36" height="50" rx="8" fill="#E8EDF2" transform="rotate(45 154 385)" />
          <rect x="340" y="360" width="36" height="50" rx="8" fill="#E8EDF2" transform="rotate(-45 358 385)" />

          {/* Inner circle mask */}
          <circle cx="256" cy="256" r="142" fill="#1D2D3E" />

          {/* USB / circuit fork symbol */}
          <line x1="256" y1="190" x2="256" y2="270" stroke="#6B5FCC" strokeWidth="20" strokeLinecap="round" />
          <line x1="256" y1="222" x2="198" y2="222" stroke="#6B5FCC" strokeWidth="18" strokeLinecap="round" />
          <line x1="256" y1="254" x2="314" y2="254" stroke="#6B5FCC" strokeWidth="18" strokeLinecap="round" />
          <circle cx="194" cy="222" r="20" fill="none" stroke="#6B5FCC" strokeWidth="16" />
          <rect x="300" y="238" width="32" height="32" rx="5" fill="none" stroke="#6B5FCC" strokeWidth="16" />
          <circle cx="256" cy="316" r="24" fill="#6B5FCC" />
        </svg>
      </div>

      {!compact && (
        <div className="min-w-0">
          <p
            className={
              inverse
                ? "truncate text-sm font-semibold tracking-tight text-white"
                : "truncate text-sm font-semibold tracking-tight text-ud-ink"
            }
          >
            <span>UNIF</span>
            <span className={inverse ? "text-[#6B5FCC]" : "text-[#6B5FCC]"}>DATA</span>
          </p>

          {companyName && (
            <p
              className={
                inverse
                  ? "truncate text-xs font-medium text-white/60"
                  : "truncate text-xs font-medium text-ud-muted"
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
