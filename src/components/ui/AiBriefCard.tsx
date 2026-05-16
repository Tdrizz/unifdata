import type { ReactNode } from "react";
import Link from "next/link";

type Bullet = {
  text: string;
};

export function AiBriefCard({
  headline,
  subtext,
  bullets,
  actions,
}: {
  headline: string;
  subtext?: string;
  bullets?: Bullet[];
  actions?: { label: string; href: string }[];
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[22px] p-[22px] text-white"
      style={{ background: "linear-gradient(160deg, #1D2D3E 0%, #2b3d52 100%)" }}
    >
      {/* Olive radial glow decoration */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #4A3FA8 0%, transparent 70%)" }}
      />

      {/* Header */}
      <div className="relative flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#4A3FA8]">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
          </svg>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
          UnifData AI
        </p>
      </div>

      {/* Content */}
      <div className="relative">
        <p className="text-[17px] font-semibold leading-snug">{headline}</p>
        {subtext && (
          <p className="mt-2 text-[13px] leading-6 text-white/70">{subtext}</p>
        )}

        {bullets && bullets.length > 0 && (
          <ul className="mt-3 space-y-2">
            {bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4A3FA8]" />
                <p className="text-[13px] leading-5 text-white/82">{bullet.text}</p>
              </li>
            ))}
          </ul>
        )}

        {actions && actions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex-1 rounded-xl bg-white/14 px-3 py-2.5 text-center text-xs font-semibold text-white hover:bg-white/20 transition-colors"
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
