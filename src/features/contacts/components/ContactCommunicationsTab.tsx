"use client";

import { useEffect, useState } from "react";

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  sent_at: string;
};

type Thread = {
  id: string;
  contact_phone: string | null;
};

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ContactCommunicationsTab({
  contactId,
  orgId: _orgId,
}: {
  contactId: string;
  // Kept for call-site compatibility (ContactTabs passes it to every tab) --
  // org scoping now happens server-side in api/communications/by-contact,
  // derived from the authenticated session rather than trusted from a
  // client-side prop.
  orgId: string;
}) {
  const [thread, setThread] = useState<Thread | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/communications/by-contact?contact_id=${encodeURIComponent(contactId)}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { thread: Thread | null; messages: Message[] };
        setThread(data.thread);
        setMessages(data.messages);
      } catch {
        if (!cancelled) setThread(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (thread === undefined) {
    return (
      <div className="py-10 text-center">
        <p className="text-[12.5px] text-ud-muted">Loading…</p>
      </div>
    );
  }

  if (!thread || messages.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-[13px] font-semibold text-ud-ink mb-1">No messages yet</p>
        <p className="text-[12.5px] text-ud-muted mb-4">SMS conversations with this contact will appear here.</p>
        <a href="/communications" className="text-[12.5px] text-ud-accent hover:underline">
          View all communications →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] px-3 py-2 rounded-[12px] ${
              msg.direction === "outbound"
                ? "bg-ud-accent text-white"
                : "bg-ud-surface-sunk text-ud-ink border border-ud"
            }`}
          >
            <div className="text-[13px] whitespace-pre-wrap">{msg.body}</div>
            <div className={`text-[10px] mt-0.5 ${msg.direction === "outbound" ? "text-white/70" : "text-ud-faint"}`}>
              {formatMessageTime(msg.sent_at)}
            </div>
          </div>
        </div>
      ))}
      <div className="pt-2 text-center">
        <a href="/communications" className="text-[12.5px] text-ud-accent hover:underline">
          Open in Communications →
        </a>
      </div>
    </div>
  );
}
