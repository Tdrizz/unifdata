"use client";

import { useState, useTransition } from "react";
import { createTagAction, renameTagAction, deleteTagAction } from "../actions";

export type TagItem = { id: string; name: string; color: string; contactCount: number };

type Props = { orgId: string; initialTags: TagItem[] };

const COLOR_SWATCHES = ["#EF4444", "#F59E0B", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#6B7280"];

const btnGhost = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms]";
const btnInk = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-ink text-white hover:opacity-85 transition-opacity duration-[120ms] disabled:opacity-40";
const btnDanger = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-surface border border-ud text-red-500 hover:border-red-300 transition-[color,border-color] duration-[120ms] disabled:opacity-40";

export function TagsSettings({ orgId, initialTags }: Props) {
  const [tags, setTags] = useState<TagItem[]>(initialTags);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_SWATCHES[0]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleCreate() {
    if (!newName.trim()) return;
    const name = newName.trim();
    const color = newColor;
    startTransition(async () => {
      try {
        await createTagAction(orgId, name, color);
        setTags((prev) => [...prev, { id: crypto.randomUUID(), name, color, contactCount: 0 }]);
        setNewName("");
        setNewColor(COLOR_SWATCHES[0]);
        setShowNewForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create tag");
      }
    });
  }

  function handleRenameStart(tag: TagItem) {
    setRenamingId(tag.id);
    setRenameValue(tag.name);
  }

  function handleRenameSave(tagId: string) {
    if (!renameValue.trim()) return;
    const name = renameValue.trim();
    startTransition(async () => {
      try {
        await renameTagAction(tagId, name);
        setTags((prev) => prev.map((t) => (t.id === tagId ? { ...t, name } : t)));
        setRenamingId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to rename tag");
      }
    });
  }

  function handleDelete(tagId: string) {
    startTransition(async () => {
      try {
        await deleteTagAction(tagId);
        setTags((prev) => prev.filter((t) => t.id !== tagId));
        setDeletingId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete tag");
      }
    });
  }

  return (
    <div>
      {error && (
        <p className="text-[12px] text-red-500 mb-3">{error}</p>
      )}

      {showNewForm && (
        <div className="flex items-center gap-3 mb-3 p-3 rounded-[10px] border border-ud bg-ud-bg">
          <input
            className="form-input flex-1"
            placeholder="Tag name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowNewForm(false); }}
            autoFocus
          />
          <div className="flex items-center gap-1.5">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full border-2 transition-all"
                style={{
                  background: c,
                  borderColor: newColor === c ? "#171614" : "transparent",
                  transform: newColor === c ? "scale(1.15)" : "scale(1)",
                }}
                aria-label={c}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={() => setShowNewForm(false)}>Cancel</button>
            <button type="button" className={btnInk} onClick={handleCreate} disabled={!newName.trim()}>Create</button>
          </div>
        </div>
      )}

      {tags.length === 0 && !showNewForm && (
        <p className="text-[12px] text-ud-muted mb-3">No tags yet.</p>
      )}

      {tags.map((tag) => (
        <div key={tag.id} className="flex items-center gap-3 py-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-b-0">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: tag.color }} />

          {renamingId === tag.id ? (
            <>
              <input
                className="form-input flex-1"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRenameSave(tag.id); if (e.key === "Escape") setRenamingId(null); }}
                autoFocus
              />
              <div className="flex gap-1.5 ml-auto">
                <button type="button" className={btnGhost} onClick={() => setRenamingId(null)}>Cancel</button>
                <button type="button" className={btnInk} onClick={() => handleRenameSave(tag.id)}>Save</button>
              </div>
            </>
          ) : deletingId === tag.id ? (
            <>
              <span className="flex-1 text-[13px] font-medium text-ud-ink">{tag.name}</span>
              <span className="text-[12px] text-ud-muted">Remove from all contacts?</span>
              <div className="flex gap-1.5 ml-auto">
                <button type="button" className={btnGhost} onClick={() => setDeletingId(null)}>Cancel</button>
                <button type="button" className={btnDanger} onClick={() => handleDelete(tag.id)}>Confirm</button>
              </div>
            </>
          ) : (
            <>
              <span className="flex-1 text-[13px] font-medium text-ud-ink">{tag.name}</span>
              <span className="text-[11.5px] text-ud-faint">{tag.contactCount} contact{tag.contactCount !== 1 ? "s" : ""}</span>
              <div className="flex gap-1.5">
                <button type="button" className={btnGhost} onClick={() => handleRenameStart(tag)}>Rename</button>
                <button type="button" className={btnGhost} style={{ color: "var(--danger, #dc2626)" }} onClick={() => setDeletingId(tag.id)}>Delete</button>
              </div>
            </>
          )}
        </div>
      ))}

      {!showNewForm && (
        <div className="mt-3">
          <button type="button" className={btnGhost} onClick={() => setShowNewForm(true)}>+ New tag</button>
        </div>
      )}
    </div>
  );
}
