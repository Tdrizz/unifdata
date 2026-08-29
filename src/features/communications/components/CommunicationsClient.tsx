"use client";

import { useState, useEffect, useRef, useTransition } from "react";

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

// A contact chosen to message who doesn't have a thread yet -- no
// communications row exists until the first message actually sends, same as
// most messaging apps (picking someone doesn't create an empty conversation).
type PendingContact = { id: string; name: string; phone: string | null; email: string | null };

type ContactSearchResult = { id: string; name: string; email: string | null; phone: string | null };

function normalizeChannel(channel: string): "sms" | "email" {
  return channel === "email" ? "email" : "sms";
}

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
  initialPendingContact = null,
  initialSelectedThreadId = null,
}: {
  threads: Thread[];
  orgId: string;
  // Set when the page was opened as /communications?contact=<id> for a
  // contact with no existing thread — see page.tsx, which resolves the id
  // server-side and either finds an existing thread (selects it directly via
  // initialSelectedThreadId below) or falls back to this.
  initialPendingContact?: PendingContact | null;
  // Set when /communications?contact=<id> matched a contact who already has
  // a thread — opens straight into it instead of defaulting to the most
  // recent conversation.
  initialSelectedThreadId?: string | null;
}) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedThreadId ?? initialThreads[0]?.id ?? null
  );
  const [pendingContact, setPendingContact] = useState<PendingContact | null>(initialPendingContact);
  // Which channel a not-yet-started conversation will send on. Defaults to
  // SMS when the contact has a phone on file, email otherwise; a toggle lets
  // the user switch when the contact has both.
  const [pendingChannel, setPendingChannel] = useState<"sms" | "email">(
    initialPendingContact && !initialPendingContact.phone && initialPendingContact.email ? "email" : "sms"
  );
  // Only used when starting a new email conversation -- replies have nowhere
  // to store a subject (no column on communication_messages), so this is
  // never shown once a thread already exists.
  const [emailSubject, setEmailSubject] = useState("");
  // Mobile has no room for both panes at once, so it shows one at a time --
  // the thread list, or the selected conversation, with a back button
  // between them. Desktop ignores this entirely and always shows both (see
  // the md:flex overrides below); this previously gated the whole page
  // behind a static "use desktop" notice even for plain SMS replies, which
  // contradicted Communications being one of only four primary mobile tabs.
  const [mobileView, setMobileView] = useState<"list" | "thread">(
    initialPendingContact || initialSelectedThreadId ? "thread" : "list"
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [compose, setCompose] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ContactSearchResult[]>([]);
  const [confirmDeleteThread, setConfirmDeleteThread] = useState(false);
  const [isDeletingThread, setIsDeletingThread] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedThread = threads.find((t) => t.id === selectedId) ?? null;

  // Load messages when thread changes, then poll for new ones. This used to
  // be a direct client-side Supabase query plus a postgres_changes realtime
  // subscription -- neither could ever work, because the browser's Supabase
  // client (src/lib/supabase/client.ts) has no real session (this app's
  // identity system is Clerk, not Supabase Auth), so auth.uid() is always
  // null and RLS silently returns zero rows to it no matter what's actually
  // in the table. Fetching through api/communications/[id]/messages (a
  // server route using the same verified-then-admin-client pattern every
  // other route here uses) instead of Supabase directly is what actually
  // works; polling is a plain, reliable stand-in for the realtime updates
  // that in practice were never being delivered.
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    async function loadMessages() {
      try {
        const res = await fetch(`/api/communications/${selectedId}/messages`);
        if (res.ok && !cancelled) {
          setMessages(await res.json());
        }
      } catch {
        // Best-effort -- the next poll tick will retry.
      }
    }

    loadMessages();
    const interval = setInterval(loadMessages, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedId]);

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
    void fetch(`/api/communications/${selectedId}`, { method: "PATCH" });
  }, [selectedId]);

  // Switching threads shouldn't carry over an in-progress delete confirmation
  useEffect(() => {
    setConfirmDeleteThread(false);
    setDeleteError(null);
  }, [selectedId]);

  async function handleDeleteThread() {
    if (!selectedId) return;
    setIsDeletingThread(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/communications/${selectedId}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        setDeleteError(errData.error ?? "Failed to delete conversation.");
        return;
      }
      setThreads((prev) => prev.filter((t) => t.id !== selectedId));
      setSelectedId(null);
      setMobileView("list");
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setIsDeletingThread(false);
    }
  }

  async function handleSend() {
    if (!compose.trim() || (!selectedId && !pendingContact)) return;
    const body = compose.trim();
    const subject = emailSubject.trim();
    setCompose("");
    setSendError(null);

    // Two different endpoints depending on whether a thread already exists:
    // replying into one (api/communications/[id]/send) vs. starting the
    // first message with a contact who has none yet (api/communications/start,
    // which also creates the thread row).
    const startingNew = !selectedId && pendingContact;

    startSending(async () => {
      try {
        const res = await fetch(
          startingNew ? "/api/communications/start" : `/api/communications/${selectedId}/send`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              startingNew
                ? {
                    contact_id: pendingContact.id,
                    body,
                    channel: pendingChannel,
                    ...(pendingChannel === "email" && subject ? { subject } : {}),
                  }
                : { body }
            ),
          },
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string };
          setSendError(errData.error ?? "Failed to send message.");
          setCompose(body);
          return;
        }

        if (startingNew) {
          const { thread: newThread, message: newMessage } = await res.json();
          setThreads((prev) => [newThread, ...prev]);
          setMessages([newMessage]);
          setSelectedId(newThread.id);
          setPendingContact(null);
          setEmailSubject("");
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

  // Debounced contact search for "New message" -- same API and timing
  // CommandPalette/ContactCombobox already use elsewhere in the app.
  useEffect(() => {
    if (!showSearch) return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setSearchResults((await res.json()) as ContactSearchResult[]);
      } catch {
        // Best-effort
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, showSearch]);

  // A contact can now have two threads (SMS + email), so "already have a
  // thread with them" has to also match on channel -- otherwise picking a
  // contact who's only ever texted in, then choosing Email, would silently
  // reopen the SMS thread instead of starting the email one.
  function selectContact(contact: PendingContact, channel: "sms" | "email") {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    setEmailSubject("");
    setPendingChannel(channel);

    const existing = threads.find((t) => t.contact_id === contact.id && normalizeChannel(t.channel) === channel);
    if (existing) {
      setSelectedId(existing.id);
      setPendingContact(null);
    } else {
      setSelectedId(null);
      setPendingContact(contact);
    }
    setMessages([]);
    setMobileView("thread");
  }

  function handlePickContact(contact: ContactSearchResult) {
    const channel: "sms" | "email" = contact.phone ? "sms" : "email";
    selectContact({ id: contact.id, name: contact.name || "Unnamed", phone: contact.phone, email: contact.email }, channel);
  }

  const messageGroups = groupMessages(messages);
  const activeName = pendingContact ? pendingContact.name : selectedThread ? getContactDisplayName(selectedThread) : null;
  const activeSubtitle = pendingContact
    ? (pendingChannel === "email" ? pendingContact.email : pendingContact.phone)
    : selectedThread
    ? (selectedThread.contact_phone ?? selectedThread.channel)
    : null;
  const activeSubtitleFallback = pendingContact && pendingChannel === "email"
    ? "No email address on file"
    : "No phone number on file";

  return (
    <>
    <div className="flex h-full">
      {/* Thread list — full width on mobile until a thread is picked, a
          fixed side column on desktop where both panes always show. */}
      <div className={`${mobileView === "list" ? "flex" : "hidden"} md:flex w-full md:w-72 shrink-0 border-r border-ud flex-col`}>
        <div className="px-4 py-4 border-b border-ud flex items-start justify-between gap-2">
          <div>
            <h1 className="text-[16px] font-bold text-ud-ink">Communications</h1>
            <p className="text-[12px] text-ud-faint mt-0.5">Text and email conversations</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSearch((v) => !v)}
            aria-label="New message"
            className={`shrink-0 w-7 h-7 rounded-[8px] flex items-center justify-center transition-colors ${
              showSearch ? "bg-ud-accent text-white" : "bg-ud-surface-sunk text-ud-muted hover:text-ud-ink"
            }`}
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        {showSearch && (
          <div className="px-4 py-3 border-b border-ud bg-ud-surface-sunk/50">
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts by name or phone…"
              className="w-full px-3 py-2 bg-ud-surface border border-ud rounded-[8px] text-[13px] text-ud-ink placeholder:text-ud-faint outline-none focus:border-ud-accent"
            />
            {searchResults.length > 0 && (
              <div className="mt-2 rounded-[8px] border border-ud overflow-hidden bg-ud-surface">
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handlePickContact(c)}
                    className="w-full text-left px-3 py-2 border-b border-ud-soft last:border-0 hover:bg-ud-surface-sunk transition-colors"
                  >
                    <div className="text-[13px] font-medium text-ud-ink">{c.name || "Unnamed"}</div>
                    {(c.phone || c.email) && (
                      <div className="text-[11px] text-ud-faint">{c.phone ?? c.email}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {searchQuery.trim() && searchResults.length === 0 && (
              <p className="mt-2 text-[12px] text-ud-faint px-1">No contacts found.</p>
            )}
          </div>
        )}
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
                  setPendingContact(null);
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
        {!selectedThread && !pendingContact ? (
          <div className="flex-1 flex items-center justify-center text-[13px] text-ud-muted">
            Select a conversation
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="px-4 md:px-6 py-4 border-b border-ud flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setMobileView("list");
                  setPendingContact(null);
                }}
                aria-label="Back to conversations"
                className="md:hidden shrink-0 -ml-1 p-1 text-ud-muted hover:text-ud-ink"
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[15px] text-ud-ink truncate">
                  {activeName}
                </div>
                <div className="text-[12px] text-ud-faint">
                  {activeSubtitle ?? activeSubtitleFallback}
                </div>
              </div>
              {pendingContact && pendingContact.phone && pendingContact.email && (
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => selectContact(pendingContact, "sms")}
                    className={`px-2 py-1 rounded-[6px] text-[11px] font-semibold transition-colors ${
                      pendingChannel === "sms" ? "bg-ud-accent text-white" : "bg-ud-surface-sunk text-ud-muted hover:text-ud-ink"
                    }`}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => selectContact(pendingContact, "email")}
                    className={`px-2 py-1 rounded-[6px] text-[11px] font-semibold transition-colors ${
                      pendingChannel === "email" ? "bg-ud-accent text-white" : "bg-ud-surface-sunk text-ud-muted hover:text-ud-ink"
                    }`}
                  >
                    Email
                  </button>
                </div>
              )}
              {selectedThread && (
                <div className="shrink-0">
                  {confirmDeleteThread ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleDeleteThread}
                        disabled={isDeletingThread}
                        className="px-2.5 py-1 rounded-[6px] bg-red-600 text-white text-[11px] font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        {isDeletingThread ? "Deleting…" : "Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteThread(false)}
                        disabled={isDeletingThread}
                        className="px-2.5 py-1 rounded-[6px] border border-ud text-[11px] text-ud-muted hover:text-ud-ink transition-colors"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteThread(true)}
                      aria-label="Delete conversation"
                      className="p-1.5 text-ud-faint hover:text-ud-danger transition-colors"
                    >
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            {deleteError && (
              <p className="px-4 md:px-6 pt-2 text-[12px] text-ud-danger">{deleteError}</p>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
              {pendingContact && messageGroups.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-10 text-[13px] text-ud-muted">
                  Send a message to start the conversation.
                </div>
              )}
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

            {/* Compose. Blocked only when the contact doesn't have the info
                a chosen channel needs (no phone for SMS, no email address for
                email) -- both channels can otherwise send: the reply route
                and the start route both branch on channel server-side. */}
            {pendingContact && pendingChannel === "sms" && !pendingContact.phone ? (
              <div className="px-4 md:px-6 py-4 border-t border-ud">
                <div className="flex items-start gap-3 px-4 py-3 bg-ud-surface-sunk border border-ud rounded-[10px]">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="text-ud-faint shrink-0 mt-0.5">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/>
                  </svg>
                  <p className="text-[13px] text-ud-muted leading-[1.5]">
                    {pendingContact.name} doesn&apos;t have a phone number on file, so a text can&apos;t be started here yet.
                  </p>
                </div>
              </div>
            ) : pendingContact && pendingChannel === "email" && !pendingContact.email ? (
              <div className="px-4 md:px-6 py-4 border-t border-ud">
                <div className="flex items-start gap-3 px-4 py-3 bg-ud-surface-sunk border border-ud rounded-[10px]">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="text-ud-faint shrink-0 mt-0.5">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>
                  </svg>
                  <p className="text-[13px] text-ud-muted leading-[1.5]">
                    {pendingContact.name} doesn&apos;t have an email address on file, so an email can&apos;t be started here yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-4 md:px-6 py-4 border-t border-ud">
                {sendError && (
                  <p className="text-[12px] text-ud-danger mb-2">{sendError}</p>
                )}
                {pendingContact && pendingChannel === "email" && (
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Subject (optional)"
                    className="w-full mb-2 px-3 py-2 bg-ud-surface border border-ud rounded-[10px] text-[13px] text-ud-ink placeholder:text-ud-faint outline-none focus:border-ud-accent"
                  />
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
