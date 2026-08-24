"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { ContactForSelect } from "@/lib/crm/types";

const DEFAULT_INPUT_CLASS =
  "w-full rounded-[9px] border border-ud bg-ud-surface px-3.5 py-[10px] text-[14px] text-ud-ink outline-none transition-[box-shadow,border-color] duration-150 focus:ring-2 focus:ring-ud-accent/10 focus:border-ud-accent placeholder:text-ud-faint";

type Props = {
  name: string;
  defaultValue?: string | null;
  defaultLabel?: string | null;
  placeholder?: string;
  className?: string;
};

// Searchable contact picker: type-to-filter against /api/contacts/search
// instead of dumping every contact into one native <select>, plus an inline
// "+ Add new contact" so linking someone who doesn't exist yet doesn't mean
// abandoning whatever form you're in the middle of filling out.
//
// The results dropdown is portaled to document.body with fixed positioning
// instead of being an absolutely-positioned child of the input wrapper.
// Several of this component's callers (mobile Job/Lead/Follow-up quick-add)
// render inside BottomSheet, which is a scrollable/overflow-clipped
// container — an absolute dropdown gets clipped or rendered non-interactive
// there, so results are visible but not tappable. Fixed-position + portal
// escapes that clipping regardless of what ancestor the combobox sits in.
export function ContactCombobox({ name, defaultValue, defaultLabel, placeholder = "Search by name, email, or phone…", className }: Props) {
  const [selectedId, setSelectedId] = useState(defaultValue || "");
  const [selectedLabel, setSelectedLabel] = useState(defaultLabel || "");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactForSelect[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          setResults((await res.json()) as ContactForSelect[]);
        }
      } catch {
        // Non-fatal — search just comes back empty
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }

    updatePosition();
    // capture:true catches scroll on any ancestor (e.g. BottomSheet's own
    // scrollable div), not just window — scroll events don't bubble, but a
    // capturing listener on window still sees them on the way down to target.
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
      setCreating(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectContact(c: ContactForSelect) {
    setSelectedId(c.id);
    setSelectedLabel(c.name || c.email || c.phone || "Unnamed person");
    setQuery("");
    setResults([]);
    setOpen(false);
    setCreating(false);
  }

  function clearSelection() {
    setSelectedId("");
    setSelectedLabel("");
    setQuery("");
  }

  async function handleCreate() {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const trimmedContact = newContact.trim();
      const isEmail = trimmedContact.includes("@");
      const res = await fetch("/api/contacts/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: isEmail ? trimmedContact : undefined,
          phone: !isEmail && trimmedContact ? trimmedContact : undefined,
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as ContactForSelect;
        selectContact(created);
        setNewName("");
        setNewContact("");
      }
    } finally {
      setSaving(false);
    }
  }

  const inputClass = className ?? DEFAULT_INPUT_CLASS;

  const dropdown =
    mounted && open && !selectedId && coords
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 200 }}
            className="max-h-[260px] overflow-y-auto rounded-[10px] border border-ud bg-ud-surface shadow-lg"
          >
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                className="w-full border-b border-ud-soft px-3 py-2 text-left transition-colors last:border-0 hover:bg-ud-surface-sunk"
                onClick={() => selectContact(r)}
              >
                <p className="text-[13px] font-medium text-ud-ink">{r.name || "Unnamed person"}</p>
                {(r.email || r.phone) && <p className="text-[11px] text-ud-muted">{r.email ?? r.phone}</p>}
              </button>
            ))}

            {!creating ? (
              <button
                type="button"
                className="w-full border-t border-ud-soft px-3 py-2 text-left text-[13px] font-semibold text-ud-accent transition-colors hover:bg-ud-surface-sunk"
                onClick={() => {
                  setCreating(true);
                  setNewName(query);
                }}
              >
                + Add new contact
              </button>
            ) : (
              <div className="space-y-2 border-t border-ud-soft p-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name"
                  className="w-full rounded-[8px] border border-ud bg-ud-surface-sunk px-3 py-2 text-[13px] text-ud-ink outline-none placeholder:text-ud-faint focus:border-ud-accent"
                />
                <input
                  type="text"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="Phone or email (optional)"
                  className="w-full rounded-[8px] border border-ud bg-ud-surface-sunk px-3 py-2 text-[13px] text-ud-ink outline-none placeholder:text-ud-faint focus:border-ud-accent"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newName.trim() || saving}
                  className="w-full rounded-[8px] bg-ud-accent py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {saving ? "Adding…" : "Add contact"}
                </button>
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={selectedId} />
      {selectedId ? (
        <div className={cn(inputClass, "flex items-center justify-between gap-2 cursor-default")}>
          <span className="truncate">{selectedLabel}</span>
          <button type="button" onClick={clearSelection} className="shrink-0 text-xs text-ud-faint hover:text-ud-ink">
            ✕
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          placeholder={placeholder}
          className={inputClass}
        />
      )}

      {dropdown}
    </div>
  );
}
