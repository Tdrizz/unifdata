"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Thread = {
  id: string;
  contact_id: string | null;
  contact_phone: string | null;
  channel: string;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  status: string;
  contact?: { id: string; name?: string | null; first_name?: string | null; last_name?: string | null } | null;
};

type Message = {
  id: string;
  communication_id: string;
  direction: "inbound" | "outbound";
  body: string;
  status: string | null;
  sent_at: string;
};

function getContactDisplayName(thread: Thread): string {
  const c = thread.contact;
  if (!c) return thread.contact_phone ?? "Unknown";
  if (c.name) return c.name;
  return (`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || thread.contact_phone) ?? "Unknown";
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 86400000) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateDivider(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function groupMessages(messages: Message[]): { date: string; items: Message[] }[] {
  const map = new Map<string, Message[]>();
  for (const m of messages) {
    const date = new Date(m.sent_at).toDateString();
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(m);
  }
  return Array.from(map.entries()).map(([, items]) => ({
    date: items[0].sent_at,
    items,
  }));
}

export function CommunicationsClient({
  threads: initialThreads,
  orgId: _orgId,
}: {
  threads: Thread[];
  orgId: string;
}) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialThreads[0]?.id ?? null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [compose, setCompose] = useState("");
  const [isSending, startSending] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const selectedThread = threads.find((t) => t.id === selectedId) ?? null;

  // Load messages when thread changes
  useEffect(() => {
    if (!selectedId) return;

    async function loadMessages() {
      const { data } = await (supabase as any)
        .from("communication_messages")
        .select("id, communication_id, direction, body, status, sent_at")
        .eq("communication_id", selectedId)
        .order("sent_at", { ascending: true });
      setMessages(data ?? []);
    }

    loadMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`comm-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "communication_messages",
          filter: `communication_id=eq.${selectedId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId, supabase]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark thread as read when selected
  useEffect(() => {
    if (!selectedId) return;
    setThreads((prev) =>
      prev.map((t) => (t.id === selectedId ? { ...t, unread_count: 0 } : t))
    );
    (supabase as any)
      .from("communications")
      .update({ unread_count: 0 })
      .eq("id", selectedId);
  }, [selectedId, supabase]);

  async function handleSend() {
    if (!compose.trim() || !selectedId) return;
    const body = compose.trim();
    setCompose("");

    startSending(async () => {
      const res = await fetch(`/api/communications/${selectedId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        // Update thread preview
        setThreads((prev) =>
          prev.map((t) =>
            t.id === selectedId
              ? { ...t, last_message_preview: body, last_message_at: newMessage.sent_at }
              : t
          )
        );
      }
    });
  }

  const messageGroups = groupMessages(messages);

  return (
    <div className="hidden md:flex h-full">
      {/* Thread list */}
      <div className="w-72 shrink-0 border-r border-ud flex flex-col">
        <div className="px-4 py-4 border-b border-ud">
          <h1 className="text-[16px] font-bold text-ud-ink">Communications</h1>
          <p className="text-[12px] text-ud-faint mt-0.5">SMS conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <div className="py-10 text-center text-[13px] text-ud-muted px-4">
              No conversations yet. Messages from customers will appear here.
            </div>
          )}
          {threads.map((thread) => {
            const name = getContactDisplayName(thread);
            const isSelected = thread.id === selectedId;

            return (
              <button
                key={thread.id}
                onClick={() => setSelectedId(thread.id)}
                className={`w-full text-left px-4 py-3 border-b border-ud/50 transition-colors ${
                  isSelected ? "bg-ud-accent/10" : "hover:bg-ud-surface-sunk"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {thread.unread_count > 0 && (
                        <span className="w-2 h-2 rounded-full bg-ud-accent shrink-0" />
                      )}
                      <span className="text-[13px] font-semibold text-ud-ink truncate">
                        {name}
                      </span>
                    </div>
                    {thread.last_message_preview && (
                      <div className="text-[12px] text-ud-muted truncate mt-0.5">
                        {thread.last_message_preview}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-ud-faint shrink-0">
                    {formatTime(thread.last_message_at)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col">
        {!selectedThread ? (
          <div className="flex-1 flex items-center justify-center text-[13px] text-ud-muted">
            Select a conversation
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="px-6 py-4 border-b border-ud">
              <div className="font-semibold text-[15px] text-ud-ink">
                {getContactDisplayName(selectedThread)}
              </div>
              <div className="text-[12px] text-ud-faint">
                {selectedThread.contact_phone ?? selectedThread.channel}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messageGroups.map((group) => (
                <div key={group.date}>
                  <div className="text-center text-[11px] text-ud-faint my-3">
                    {formatDateDivider(group.date)}
                  </div>
                  {group.items.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex mb-2 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-[12px] ${
                          msg.direction === "outbound"
                            ? "bg-ud-accent text-white"
                            : "bg-ud-surface-sunk text-ud-ink border border-ud"
                        }`}
                      >
                        <div className="text-[13px]">{msg.body}</div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            msg.direction === "outbound" ? "text-white/70" : "text-ud-faint"
                          }`}
                        >
                          {formatMessageTime(msg.sent_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose */}
            <div className="px-6 py-4 border-t border-ud">
              <div className="flex gap-2 items-end">
                <textarea
                  value={compose}
                  onChange={(e) => setCompose(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message… (Enter to send)"
                  rows={2}
                  className="flex-1 px-3 py-2 bg-ud-surface border border-ud rounded-[10px] text-[13px] text-ud-ink placeholder:text-ud-faint outline-none focus:border-ud-accent resize-none"
                  style={{ fontFamily: "var(--font)" }}
                />
                <button
                  onClick={handleSend}
                  disabled={isSending || !compose.trim()}
                  className="px-4 py-2 bg-ud-accent text-white text-[13px] font-semibold rounded-[10px] hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
