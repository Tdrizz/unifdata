"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SavedView = { id: string; name: string; filters: Record<string, string> };

type Props = {
  pathname: string;
  // The filter combination currently applied via query params (q/status/
  // tag/source) — what "Save this view" actually captures. Undefined/empty
  // values are dropped before saving so a saved view's href only ever
  // carries the params that were actually set, same as the sidebar/chip
  // links already do.
  currentFilters: Record<string, string | undefined>;
};

function buildHref(base: string, filters: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

// A personal, per-user list of saved filter combinations for a list/board
// page (see database/044_saved_views.sql + /api/saved-views). Deliberately
// lightweight: no sharing, no editing a saved view's filters after the
// fact — delete and re-save is the whole "edit" story, which is fine for
// something this low-stakes (a saved view is a shortcut, not a record).
export function SavedViewsBar({ pathname, currentFilters }: Props) {
  const [views, setViews] = useState<SavedView[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const page = pathname.replace(/^\//, "");
  const hasActiveFilters = Object.values(currentFilters).some(Boolean);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/saved-views?page=${encodeURIComponent(page)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setViews(data);
      })
      .catch(() => {
        if (!cancelled) setViews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, name: trimmed, filters: currentFilters }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Couldn't save that view.");
        return;
      }
      setViews((prev) => [...(prev ?? []), data]);
      setAdding(false);
      setName("");
    } catch {
      setSaveError("Couldn't save that view.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    // Optimistic — a saved view is a personal shortcut, not a record worth
    // a confirm dialog or rollback UI if the delete happens to fail.
    setViews((prev) => (prev ?? []).filter((v) => v.id !== id));
    try {
      await fetch(`/api/saved-views/${id}`, { method: "DELETE" });
    } catch {
      // best-effort
    }
  }

  if (views === null) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {views.map((v) => (
        <span
          key={v.id}
          className="group inline-flex items-center gap-1 rounded-full border border-ud bg-ud-surface pl-3 pr-1.5 py-1 text-[12.5px] font-medium text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-colors"
        >
          <Link href={buildHref(pathname, v.filters)}>{v.name}</Link>
          <button
            type="button"
            onClick={() => handleDelete(v.id)}
            aria-label={`Remove saved view "${v.name}"`}
            className="opacity-0 group-hover:opacity-100 rounded-full px-1 text-ud-faint hover:text-ud-danger transition-opacity"
          >
            ×
          </button>
        </span>
      ))}

      {adding ? (
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setAdding(false);
                setName("");
              }
            }}
            placeholder="View name…"
            maxLength={60}
            className="w-[120px] rounded-full border border-ud bg-ud-surface px-3 py-1 text-[12.5px] text-ud-ink outline-none focus:border-ud-hard"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="rounded-full bg-ud-accent px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            Save
          </button>
        </span>
      ) : (
        hasActiveFilters && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full border border-dashed border-ud px-3 py-1 text-[12.5px] font-medium text-ud-faint hover:text-ud-muted hover:border-ud-hard transition-colors"
          >
            + Save view
          </button>
        )
      )}
      {saveError && <span className="text-[11.5px] text-ud-danger">{saveError}</span>}
    </div>
  );
}
