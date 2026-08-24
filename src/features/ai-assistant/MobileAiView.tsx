"use client";

import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AiMessage } from "./AiMessage";
import { Composer } from "./Composer";
import ReactMarkdown from "react-markdown";
import { VeraDraftCard, VeraAlertCard, getTimeOfDay, getStarterQuestions } from "@/features/ai-assistant/AiAssistantView";
import type { Draft, Alert } from "@/features/ai-assistant/AiAssistantView";
import { getAlertHref, getDraftHref } from "@/lib/agents/alert-routing";
import type { IndustryProfile } from "@/lib/industry-profiles";

type Message = {
  role: "user" | "model" | "action";
  text: string;
  streaming?: boolean;
};

type Props = {
  initialMessages?: Array<{ role: "user" | "model"; text: string }>;
  initialSessionId?: string | null;
  profile?: IndustryProfile;
  drafts?: Draft[];
  alerts?: Alert[];
};

export function MobileAiView({ initialMessages = [], initialSessionId = null, profile, drafts = [], alerts = [] }: Props) {
  const customerPlural = profile?.labels.customerPlural ?? "clients";
  const jobPlural = profile?.labels.jobPlural ?? "jobs";
  const starterQuestions = getStarterQuestions(profile);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (initialMessages.length > 0) return initialMessages;
    const total = drafts.length + alerts.length;
    if (total === 0) return [];
    return [{
      role: "model" as const,
      text: `Good ${getTimeOfDay()}. I reviewed your business overnight and found ${total === 1 ? "1 thing" : `${total} things`} that need your attention. Take a look below — tap any action to handle it, or ask me anything.`,
    }];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [draftList, setDraftList] = useState<Draft[]>(drafts);
  const [alertList, setAlertList] = useState<Alert[]>(alerts);
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [highlightId, setHighlightId] = useState<string | null>(() => searchParams.get("item"));
  // The initial "scroll to bottom" effect below fires on the very same mount
  // as the deep-link highlight effect (both depend on state that's already
  // populated on first render). Racing two smooth-scrolls on mount is
  // unreliable — mobile Safari in particular tends to let the "scroll to
  // bottom" one win, which silently defeats the deep link. Skip that first
  // bottom-scroll when we arrived via a deep link, so the highlight-scroll
  // is the only one driving the initial view.
  const skipInitialBottomScroll = useRef(Boolean(searchParams.get("item")));

  useEffect(() => {
    if (skipInitialBottomScroll.current) {
      skipInitialBottomScroll.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Deep link from Home's priority queue ("?item=draft-<id>" / "alert-<id>")
  // should land directly on that item, not just the generic page.
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(highlightId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlightId(null), 4000);
    return () => clearTimeout(t);
  }, [highlightId]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Add placeholder streaming message
    setMessages((prev) => [...prev, { role: "model", text: "", streaming: true }]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [userMessage], sessionId }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "model", text: data.error || "Something went wrong." },
        ]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.toolAction) {
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                const last = updated[lastIdx];
                if (last?.streaming) {
                  return [
                    ...updated.slice(0, lastIdx),
                    { role: "action" as const, text: parsed.toolAction },
                    last,
                  ];
                }
                return [...updated, { role: "action" as const, text: parsed.toolAction }];
              });
            }
            if (parsed.delta) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.streaming) {
                  updated[updated.length - 1] = { ...last, text: last.text + parsed.delta };
                }
                return updated;
              });
            }
            if (parsed.event === "session" && parsed.sessionId) {
              setSessionId(parsed.sessionId);
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) {
          updated[updated.length - 1] = { ...last, streaming: false };
        }
        return updated;
      });
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "model", text: "Could not reach the server." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveDraft(id: string) {
    const res = await fetch(`/api/v1/agent-drafts/${id}/approve`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error((body as { error?: string }).error ?? "Failed to approve. Try again.");
      return;
    }
    setDraftList((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleDismissDraft(id: string) {
    const res = await fetch(`/api/v1/agent-drafts/${id}/dismiss`, { method: "POST" });
    if (!res.ok) { toast.error("Failed to dismiss. Try again."); return; }
    setDraftList((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleDismissAlert(id: string) {
    const res = await fetch(`/api/v1/agent-alerts/${id}/dismiss`, { method: "POST" });
    if (!res.ok) { toast.error("Failed to dismiss. Try again."); return; }
    setAlertList((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleClear() {
    setMessages([]);
    setSessionId(null);
    if (sessionId) {
      fetch("/api/ai/session/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }
  }

  return (
    <div className="relative flex flex-col" style={{ minHeight: "calc(100vh - 60px)" }}>
      {/* Mobile page header */}
      <div className="px-[18px] pt-[18px] pb-[14px] border-b border-ud-soft flex items-center justify-between gap-3">
        <div className="flex items-center gap-[10px]">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] bg-ud-accent-tint">
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-ud-accent"
            >
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-semibold tracking-[-0.005em] text-ud-ink">
              UnifData AI
            </p>
            <p className="text-[11.5px] text-ud-muted">Reading workspace · live</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-[12.5px] font-semibold text-ud-muted hover:text-ud-ink transition-colors px-2.5 py-1.5 rounded-[8px] hover:bg-ud-surface-sunk"
          >
            New chat
          </button>
        )}
      </div>

      {/* Suggestions — stays reachable, not just before the first message */}
      <div className="px-[14px] pt-[14px] flex flex-wrap gap-2 border-b border-ud-soft pb-[14px]">
        {starterQuestions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => sendMessage(q)}
            disabled={loading}
            className="text-[12.5px] font-medium bg-ud-surface border border-ud rounded-full px-[12px] py-[7px] text-ud-text hover:border-ud-hard hover:bg-ud-surface-soft transition-colors disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-[14px] py-[14px] flex flex-col gap-[14px]">
        {messages.length === 0 && !loading && (
          <div className="rounded-[10px] border border-ud bg-ud-surface-soft px-[14px] py-3 text-[13.5px] leading-relaxed text-ud-text">
            Hello! I can help you analyze your clients, pipeline, revenue, and follow-ups. What would you like to know?
          </div>
        )}

        {messages.map((message, index) =>
          message.role === "action" ? (
            <div
              key={index}
              className="rounded-[10px] px-[14px] py-[10px] text-[12.5px] font-medium bg-ud-success-bg border border-ud-success/20 text-ud-success whitespace-pre-line"
            >
              {message.text}
            </div>
          ) : (
            <AiMessage
              key={index}
              role={message.role === "user" ? "user" : "ai"}
              isLoading={message.streaming && !message.text}
            >
              {message.text ? (
                <>
                  {message.role === "model" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  ) : message.text}
                  {message.streaming && <span className="animate-pulse text-ud-muted ml-0.5">|</span>}
                </>
              ) : null}
            </AiMessage>
          )
        )}

        {(draftList.length > 0 || alertList.length > 0) && (
          <div className="space-y-2.5">
            {draftList.map((draft) => (
              <div
                key={draft.id}
                id={`draft-${draft.id}`}
                className={
                  highlightId === `draft-${draft.id}`
                    ? "rounded-[12px] ring-2 ring-offset-2 ring-ud-accent transition-shadow duration-300"
                    : "rounded-[12px] transition-shadow duration-300"
                }
              >
                <VeraDraftCard
                  draft={draft}
                  href={getDraftHref(draft)}
                  onApprove={() => handleApproveDraft(draft.id)}
                  onDismiss={() => handleDismissDraft(draft.id)}
                />
              </div>
            ))}
            {alertList.map((alert) => (
              <div
                key={alert.id}
                id={`alert-${alert.id}`}
                className={
                  highlightId === `alert-${alert.id}`
                    ? "rounded-[12px] ring-2 ring-offset-2 ring-ud-accent transition-shadow duration-300"
                    : "rounded-[12px] transition-shadow duration-300"
                }
              >
                <VeraAlertCard
                  alert={alert}
                  href={getAlertHref(alert)}
                  onDismiss={() => handleDismissAlert(alert.id)}
                />
              </div>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div
        className="sticky bottom-0 left-0 right-0 bg-ud-page border-t border-ud"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Composer
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={loading}
          placeholder={`Ask about your ${customerPlural.toLowerCase()}, ${jobPlural.toLowerCase()}, revenue, or anything else.`}
        />
      </div>
    </div>
  );
}
