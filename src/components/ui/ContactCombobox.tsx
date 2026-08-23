"use client";

import { useEffect, useRef, useState } from "react";
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
  const ref = useRef<HTMLDivElement>(null);

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
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
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

      {open && !selectedId && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-[260px] overflow-y-auto rounded-[10px] border border-ud bg-ud-surface shadow-lg">
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
        </div>
      )}
    </div>
  );
}
