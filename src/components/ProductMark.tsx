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
            ? "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#08111F] shadow-sm"
            : "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-[#08111F] shadow-sm"
        }
      >
        <svg viewBox="0 0 512 512" className="h-10 w-10" aria-hidden="true">
          <rect width="512" height="512" rx="112" fill="#08111F" />
          <rect x="72" y="72" width="368" height="368" rx="84" fill="#0F1B2E" />

          <path
            d="M112 318C151 282 184 270 216 282C251 295 273 333 310 333C344 333 369 302 400 277"
            stroke="#E2E8F0"
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M112 370C153 348 188 340 222 348C258 357 285 382 324 381C354 380 378 363 400 344"
            stroke="#475569"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M156 246L226 210L292 236L360 158"
            stroke="#38BDF8"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <circle cx="156" cy="246" r="18" fill="#38BDF8" />
          <circle cx="226" cy="210" r="14" fill="#F8FAFC" />
          <circle cx="292" cy="236" r="14" fill="#F8FAFC" />
          <circle cx="360" cy="158" r="20" fill="#38BDF8" />

          <path
            d="M360 112L374 146L408 160L374 174L360 208L346 174L312 160L346 146L360 112Z"
            fill="#F8FAFC"
          />
        </svg>
      </div>

      {!compact && (
        <div className="min-w-0">
          <p
            className={
              inverse
                ? "truncate text-sm font-semibold tracking-tight text-white"
                : "truncate text-sm font-semibold tracking-tight text-slate-950"
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
