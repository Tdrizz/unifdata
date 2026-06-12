"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type TagItem = { id: string; name: string; color: string; count: number };

type Props = {
  totalCount: number;
  statusCounts: Record<string, number>;
  tags: TagItem[];
  sourceCounts: Record<string, number>;
  activeStatus?: string;
  activeTag?: string;
  activeSource?: string;
  profileSourceOptions: string[];
};

function buildHref(base: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  active: "Active",
  inactive: "Inactive",
  on_hold: "On Hold",
  closed: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  new: "#3B82F6",
  active: "#22C55E",
  inactive: "#9CA3AF",
  on_hold: "#F59E0B",
  closed: "#EF4444",
};

export default function ContactsSidebar({
  totalCount,
  statusCounts,
  tags,
  sourceCounts,
  activeStatus,
  activeTag,
  activeSource,
  profileSourceOptions,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQ = searchParams.get("q") ?? undefined;

  const isFiltered = !!(activeStatus || activeTag || activeSource);

  const allHref = buildHref(pathname, { q: currentQ });

  const statusOrder = ["new", "active", "inactive", "on_hold", "closed"];
  const shownStatuses = statusOrder.filter((s) => (statusCounts[s] ?? 0) > 0);

  const shownSources = profileSourceOptions.filter((s) => (sourceCounts[s] ?? 0) > 0);

  const sidebarContent = (
    <nav className="flex flex-col gap-1 text-sm">
      {/* All contacts */}
      <Link
        href={allHref}
        className={`flex items-center justify-between rounded-[8px] px-3 py-2 transition-colors ${
          !isFiltered
            ? "bg-ud-accent/15 text-ud-ink font-medium"
            : "text-ud-muted hover:bg-white/5 hover:text-ud-ink"
        }`}
      >
        <span>All Contacts</span>
        <span className="text-xs text-ud-faint tabular-nums">{totalCount}</span>
      </Link>

      {/* Status */}
      {shownStatuses.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ud-faint">
            Status
          </p>
          {shownStatuses.map((s) => {
            const href = buildHref(pathname, { q: currentQ, status: s });
            const active = activeStatus === s;
            return (
              <Link
                key={s}
                href={href}
                className={`flex items-center justify-between rounded-[8px] px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-ud-accent/15 text-ud-ink font-medium"
                    : "text-ud-muted hover:bg-white/5 hover:text-ud-ink"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[s] ?? "#9CA3AF" }}
                  />
                  {STATUS_LABELS[s] ?? s}
                </span>
                <span className="text-xs text-ud-faint tabular-nums">{statusCounts[s]}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ud-faint">
            Tags
          </p>
          {tags.map((t) => {
            const href = buildHref(pathname, { q: currentQ, tag: t.id });
            const active = activeTag === t.id;
            return (
              <Link
                key={t.id}
                href={href}
                className={`flex items-center justify-between rounded-[8px] px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-ud-accent/15 text-ud-ink font-medium"
                    : "text-ud-muted hover:bg-white/5 hover:text-ud-ink"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  {t.name}
                </span>
                <span className="text-xs text-ud-faint tabular-nums">{t.count}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Sources */}
      {shownSources.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ud-faint">
            Sources
          </p>
          {shownSources.map((s) => {
            const href = buildHref(pathname, { q: currentQ, source: s });
            const active = activeSource === s;
            return (
              <Link
                key={s}
                href={href}
                className={`flex items-center justify-between rounded-[8px] px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-ud-accent/15 text-ud-ink font-medium"
                    : "text-ud-muted hover:bg-white/5 hover:text-ud-ink"
                }`}
              >
                <span>{s}</span>
                <span className="text-xs text-ud-faint tabular-nums">{sourceCounts[s] ?? 0}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <div className="md:hidden border-b border-white/10 px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm text-ud-muted hover:text-ud-ink"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 8h12M3 12h8" />
          </svg>
          {isFiltered ? "Filters (active)" : "Filters"}
        </button>
        {open && (
          <div className="mt-3 pb-2">
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-48 shrink-0 flex-col border-r border-white/10 p-3 overflow-y-auto">
        {sidebarContent}
      </aside>
    </>
  );
}
