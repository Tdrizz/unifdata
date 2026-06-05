"use client";

import { useState } from "react";
import { ContactActivityTab } from "./ContactActivityTab";
import { ContactNotesTab } from "./ContactNotesTab";

type ActivityRow = {
  id: string;
  event_type: string;
  event_label: string;
  event_detail: string | null;
  source: string;
  created_at: string;
};

type NoteRow = {
  id: string;
  content: string;
  pinned: boolean;
  author_name: string | null;
  created_at: string;
};

type Tab = "activity" | "notes" | "communications";

export function ContactTabs({
  activities,
  notes,
  contactId,
  orgId,
}: {
  activities: ActivityRow[];
  notes: NoteRow[];
  contactId: string;
  orgId: string;
}) {
  const [tab, setTab] = useState<Tab>("activity");

  const tabs: { id: Tab; label: string }[] = [
    { id: "activity", label: "Activity" },
    { id: "notes", label: "Notes" },
    { id: "communications", label: "Communications" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-ud mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-ud-accent text-ud-accent"
                : "border-transparent text-ud-muted hover:text-ud-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "activity" && <ContactActivityTab activities={activities} />}
        {tab === "notes" && (
          <ContactNotesTab notes={notes} contactId={contactId} orgId={orgId} />
        )}
        {tab === "communications" && (
          <div className="py-10 text-center">
            <p className="text-[13px] font-semibold text-ud-ink mb-1">No messages yet</p>
            <p className="text-[12.5px] text-ud-muted mb-4">SMS conversations with this contact will appear here.</p>
            <a href="/communications" className="text-[12.5px] text-ud-accent hover:underline">
              View all communications →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
