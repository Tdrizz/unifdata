"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  orgId,
}: {
  contactId: string;
  orgId: string;
}) {
  const [thread, setThread] = useState<Thread | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const { data: threadRow } = await (supabase as any)
        .from("communications")
        .select("id, contact_phone")
        .eq("organization_id", orgId)
        .eq("contact_id", contactId)
        .maybeSingle();

      if (cancelled) return;
      const foundThread = (threadRow as Thread | null) ?? null;
      setThread(foundThread);
      if (!foundThread) return;

      const { data: messageRows } = await (supabase as any)
        .from("communication_messages")
        .select("id, direction, body, sent_at")
        .eq("communication_id", foundThread.id)
        .order("sent_at", { ascending: true });

      if (!cancelled) setMessages((messageRows as Message[]) ?? []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [contactId, orgId]);

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
