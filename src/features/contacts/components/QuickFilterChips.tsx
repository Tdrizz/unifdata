"use client";

import Link from "next/link";
import { buildHref, STATUS_COLORS, STATUS_LABELS } from "./ContactsSidebar";

type Props = {
  pathname: string;
  currentQ?: string;
  statusCounts: Record<string, number>;
  activeStatus?: string;
};

// One-click status chips above the customers table — the facet sidebar
// already supports the same filter, but it's a second click on mobile
// (behind the "Filters" toggle) and easy to miss on desktop. Surfacing the
// two or three statuses people actually filter by as chips gets the most
// common case down to a single click, without duplicating the sidebar's
// full status/tag/source filtering.
const CHIP_STATUS_ORDER = ["new", "active", "inactive"];

export function QuickFilterChips({ pathname, currentQ, statusCounts, activeStatus }: Props) {
  const totalCount = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);
  const shownStatuses = CHIP_STATUS_ORDER.filter((s) => (statusCounts[s] ?? 0) > 0);

  // Nothing to filter by (e.g. every contact shares one status) — a chip row
  // with a single "All" pill isn't a useful filter, so skip rendering it.
  if (shownStatuses.length === 0) return null;

  const allHref = buildHref(pathname, { q: currentQ });

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      <Link
        href={allHref}
        className={[
          "shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
          !activeStatus
            ? "bg-ud-ink text-white"
            : "bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard",
        ].join(" ")}
      >
        All <span className="tabular-nums opacity-70">{totalCount}</span>
      </Link>
      {shownStatuses.map((s) => {
        const active = activeStatus === s;
        const href = buildHref(pathname, { q: currentQ, status: s });
        return (
          <Link
            key={s}
            href={href}
            className={[
              "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              active
                ? "bg-ud-ink text-white"
                : "bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard",
            ].join(" ")}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: active ? "#fff" : (STATUS_COLORS[s] ?? "#9CA3AF") }}
            />
            {STATUS_LABELS[s] ?? s}{" "}
            <span className="tabular-nums opacity-70">{statusCounts[s]}</span>
          </Link>
        );
      })}
    </div>
  );
}
