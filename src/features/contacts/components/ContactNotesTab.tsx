"use client";

import { useState, useTransition } from "react";

type NoteRow = {
  id: string;
  content: string;
  pinned: boolean;
  author_name: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function addNote(contactId: string, orgId: string, content: string): Promise<NoteRow | null> {
  const res = await fetch(`/api/contacts/${contactId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, orgId }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<NoteRow>;
}

export function ContactNotesTab({
  notes: initialNotes,
  contactId,
  orgId,
}: {
  notes: NoteRow[];
  contactId: string;
  orgId: string;
}) {
  const [notes, setNotes] = useState<NoteRow[]>(initialNotes);
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    startTransition(async () => {
      const newNote = await addNote(contactId, orgId, content.trim());
      if (newNote) {
        setNotes((prev) => [newNote, ...prev]);
        setContent("");
      }
    });
  }

  const pinned = notes.filter((n) => n.pinned);
  const unpinned = notes.filter((n) => !n.pinned);
  const ordered = [...pinned, ...unpinned];

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="w-full px-3 py-2 bg-ud-surface border border-ud rounded-[8px] text-[13px] text-ud-ink placeholder:text-ud-faint outline-none focus:border-ud-accent resize-none"
          style={{ fontFamily: "var(--font)" }}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="px-3 py-1.5 bg-ud-accent text-white text-[12px] font-semibold rounded-[7px] hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {isPending ? "Saving…" : "Save note"}
          </button>
        </div>
      </form>

      {/* Notes list */}
      {ordered.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-ud-muted">
          No notes yet.
        </div>
      ) : (
        <div className="space-y-2">
          {ordered.map((note) => (
            <div
              key={note.id}
              className={`px-3 py-3 rounded-[8px] border ${note.pinned ? "border-ud-accent/30 bg-ud-accent/5" : "border-ud bg-ud-surface"}`}
            >
              {note.pinned && (
                <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-ud-accent mb-1">
                  Pinned
                </div>
              )}
              <div className="text-[13px] text-ud-ink whitespace-pre-wrap">{note.content}</div>
              <div className="text-[11px] text-ud-faint mt-1.5">
                {note.author_name ? `${note.author_name} · ` : ""}
                {formatDate(note.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
