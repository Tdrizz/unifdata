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
  // Mobile has no room for both panes at once, so it shows one at a time --
  // the thread list, or the selected conversation, with a back button
  // between them. Desktop ignores this entirely and always shows both (see
  // the md:flex overrides below); this previously gated the whole page
  // behind a static "use desktop" notice even for plain SMS replies, which
  // contradicted Communications being one of only four primary mobile tabs.
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [messages, setMessages] = useState<Message[]>([]);
  const [compose, setCompose] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
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
    void (supabase as any)
      .from("communications")
      .update({ unread_count: 0 })
      .eq("id", selectedId);
  }, [selectedId, supabase]);

  async function handleSend() {
    if (!compose.trim() || !selectedId) return;
    const body = compose.trim();
    setCompose("");
    setSendError(null);

    startSending(async () => {
      try {
        const res = await fetch(`/api/communications/${selectedId}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string };
          setSendError(errData.error ?? "Failed to send message.");
          setCompose(body);
          return;
        }

        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        setThreads((prev) =>
          prev.map((t) =>
            t.id === selectedId
              ? { ...t, last_message_preview: body, last_message_at: newMessage.sent_at }
              : t
          )
        );
      } catch {
        setSendError("Network error. Please try again.");
        setCompose(body);
      }
    });
  }

  const messageGroups = groupMessages(messages);

  return (
    <>
    <div className="flex h-full">
      {/* Thread list — full width on mobile until a thread is picked, a
          fixed side column on desktop where both panes always show. */}
      <div className={`${mobileView === "list" ? "flex" : "hidden"} md:flex w-full md:w-72 shrink-0 border-r border-ud flex-col`}>
        <div className="px-4 py-4 border-b border-ud">
          <h1 className="text-[16px] font-bold text-ud-ink">Communications</h1>
          <p className="text-[12px] text-ud-faint mt-0.5">Text and email conversations</p>
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
                onClick={() => {
                  setSelectedId(thread.id);
                  setMobileView("thread");
                }}
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
                      {thread.channel !== "sms" && (
                        <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-ud-faint bg-ud-surface-sunk border border-ud rounded-[4px] px-1 py-[1px] shrink-0">
                          Email
                        </span>
                      )}
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

      {/* Message thread — hidden on mobile until a thread is picked, since
          there's no room to show it alongside the list. */}
      <div className={`${mobileView === "thread" ? "flex" : "hidden"} md:flex flex-1 flex-col`}>
        {!selectedThread ? (
          <div className="flex-1 flex items-center justify-center text-[13px] text-ud-muted">
            Select a conversation
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="px-4 md:px-6 py-4 border-b border-ud flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileView("list")}
                aria-label="Back to conversations"
                className="md:hidden shrink-0 -ml-1 p-1 text-ud-muted hover:text-ud-ink"
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <div className="min-w-0">
                <div className="font-semibold text-[15px] text-ud-ink truncate">
                  {getContactDisplayName(selectedThread)}
                </div>
                <div className="text-[12px] text-ud-faint">
                  {selectedThread.contact_phone ?? selectedThread.channel}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
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

            {/* Compose — the send API only knows how to hand a reply to
                Twilio (SMS), so an email thread (see the mailgun webhook,
                which is the only thing that creates channel: "email" threads)
                gets a plain explanation instead of a composer that would
                just fail with a 422 every time someone hit Send. */}
            {selectedThread.channel !== "sms" ? (
              <div className="px-4 md:px-6 py-4 border-t border-ud">
                <div className="flex items-start gap-3 px-4 py-3 bg-ud-surface-sunk border border-ud rounded-[10px]">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="text-ud-faint shrink-0 mt-0.5">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>
                  </svg>
                  <p className="text-[13px] text-ud-muted leading-[1.5]">
                    This conversation came in by email, and replying from here isn&apos;t available yet.
                    To respond, reach out to this customer by phone or send them a new email directly.
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-4 md:px-6 py-4 border-t border-ud">
                {sendError && (
                  <p className="text-[12px] text-ud-danger mb-2">{sendError}</p>
                )}
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
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}
