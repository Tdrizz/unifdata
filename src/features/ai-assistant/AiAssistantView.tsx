"use client";

import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/Button";
import type { IndustryProfile } from "@/lib/industry-profiles";

export type Draft = {
  id: string;
  draft_type: string;
  subject?: string | null;
  body: string;
  action_label?: string | null;
  reasoning?: string | null;
  escalation_level?: number | null;
};

export type Alert = {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  reasoning?: string | null;
  escalation_level?: number | null;
};

type Message = {
  role: "user" | "model" | "action";
  text: string;
  streaming?: boolean;
};

export function getTimeOfDay() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

export function AriaDraftCard({ draft, onApprove, onDismiss }: { draft: Draft; onApprove: () => Promise<void>; onDismiss: () => Promise<void> }) {
  const [actioning, setActioning] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const label = draft.draft_type === "outreach_email" || draft.draft_type === "outreach_sms" ? "Send" : draft.action_label ?? "Approve";
  return (
    <div className="rounded-[12px] border border-ud bg-ud-surface p-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-ud-accent/10 flex items-center justify-center shrink-0 text-[12px]">
          {draft.draft_type === "outreach_email" ? "✉" : "💬"}
        </div>
        <div className="flex-1 min-w-0">
          {draft.subject && <p className="text-[13px] font-semibold text-ud-ink mb-0.5 truncate">{draft.subject}</p>}
          <p className="text-[12.5px] text-ud-text leading-relaxed line-clamp-2">{draft.body}</p>
          {draft.reasoning && <p className="mt-1 text-[11px] text-ud-faint italic">{draft.reasoning}</p>}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={async () => { setActioning(true); await onApprove(); setActioning(false); }} disabled={actioning || dismissing} className="flex-1 rounded-[8px] bg-ud-accent text-white text-[12.5px] font-semibold py-2 hover:opacity-90 transition-opacity disabled:opacity-40">
          {actioning ? "Sending…" : label}
        </button>
        <button onClick={async () => { setDismissing(true); await onDismiss(); setDismissing(false); }} disabled={actioning || dismissing} className="px-4 rounded-[8px] border border-ud text-ud-muted text-[12.5px] font-semibold py-2 hover:border-ud-hard hover:text-ud-ink transition-colors disabled:opacity-40">
          Skip
        </button>
      </div>
    </div>
  );
}

export function AriaAlertCard({ alert, onDismiss }: { alert: Alert; onDismiss: () => Promise<void> }) {
  const [dismissing, setDismissing] = useState(false);
  const toneClass = alert.severity === "critical"
    ? "border-ud-danger/30 bg-ud-danger-bg/30"
    : alert.severity === "warning"
    ? "border-ud-warning/30 bg-ud-warning-bg/30"
    : "border-ud";
  return (
    <div className={`rounded-[12px] border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ud-ink mb-0.5">{alert.title}</p>
          <p className="text-[12.5px] text-ud-text leading-relaxed">{alert.body}</p>
          {alert.reasoning && <p className="mt-1 text-[11px] text-ud-faint italic">{alert.reasoning}</p>}
        </div>
        <button onClick={async () => { setDismissing(true); await onDismiss(); setDismissing(false); }} disabled={dismissing} className="shrink-0 text-[12px] font-semibold text-ud-muted hover:text-ud-ink transition-colors disabled:opacity-40 px-2 py-1 rounded-[6px] hover:bg-ud-surface-sunk">
          {dismissing ? "…" : "Got it"}
        </button>
      </div>
    </div>
  );
}

const btnInk ="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-ink text-white hover:opacity-85 transition-opacity duration-[120ms]";

type Props = {
  initialMessages?: Array<{ role: "user" | "model"; text: string }>;
  initialSessionId?: string | null;
  profile?: IndustryProfile;
  drafts?: Draft[];
  alerts?: Alert[];
  isPro?: boolean;
};

export function AiAssistantView({ initialMessages = [], initialSessionId = null, profile, drafts = [], alerts = [], isPro = false }: Props) {
  const customerPlural = profile?.labels.customerPlural ?? "clients";
  const jobPlural = profile?.labels.jobPlural ?? "jobs";
  const starterQuestions = [
    `Which ${customerPlural.toLowerCase()} haven't had a ${jobPlural.toLowerCase().replace(/s$/, "")} in 90+ days?`,
    `Summarize this month's revenue by ${customerPlural.toLowerCase().replace(/s$/, "")}`,
    "Draft a payment reminder for overdue invoices",
    "What's our close rate this quarter?",
  ];
  const [messages, setMessages] = useState<Message[]>(() => {
    if (initialMessages.length > 0) return initialMessages;
    const total = drafts.length + alerts.length;
    if (total === 0 || !isPro) return [];
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
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
        body: JSON.stringify({
          messages: [userMessage],
          sessionId,
        }),
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
              // Insert action bubble before the streaming placeholder
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

      // Mark streaming done
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
    <div className="hidden md:block px-8 pt-7 pb-12">
      <PageHeader
        eyebrow="AI Assistant"
        title="Business advisor"
        description="Ask anything about your clients, pipeline, or revenue."
        className="mb-6"
      />

      <div className="grid grid-cols-[1.2fr_0.8fr] gap-5 items-start">
        {/* Chat card */}
        <div className="bg-ud-surface border border-[rgba(0,0,0,0.06)] rounded-[var(--radius-ud-lg)] shadow-ud overflow-hidden flex flex-col">
          <div className="px-[22px] py-4 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between gap-3">
            <p className="text-[13.5px] font-semibold text-ud-ink">Chat</p>
            <Button variant="secondary" size="sm" onClick={handleClear}>New conversation</Button>
          </div>

          <div className="flex flex-col gap-3.5 p-[18px_20px] min-h-[300px]">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col gap-1">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.10em] text-ud-accent">AI Assistant</p>
                <div className="rounded-[10px] px-[14px] py-3 text-[13.5px] leading-relaxed bg-ud-surface-sunk text-ud-text">
                  Hello! I can help you analyze your clients, pipeline, revenue, and follow-ups. What would you like to know?
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="flex flex-col gap-1">
                {msg.role === "action" ? (
                  <div className="rounded-[10px] px-[14px] py-2.5 text-[12.5px] font-medium bg-ud-success-bg border border-ud-success/20 text-ud-success whitespace-pre-line">
                    {msg.text}
                  </div>
                ) : (
                  <>
                    <p className={`text-[10.5px] font-bold uppercase tracking-[0.10em] ${msg.role === "user" ? "text-ud-accent" : "text-ud-accent"}`}>
                      {msg.role === "user" ? "You" : "AI Assistant"}
                    </p>
                    <div className={`rounded-[10px] px-[14px] py-3 text-[13.5px] leading-relaxed ${msg.role === "user" ? "bg-ud-accent-tint border border-[rgba(74,63,168,0.18)] text-ud-text" : "bg-ud-surface-sunk text-ud-text"}`}>
                      {msg.role === "model" && msg.text ? (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
                            li: ({ children }) => <li>{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-ud-ink">{children}</strong>,
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      ) : (
                        <>
                          {msg.text || (msg.streaming ? <span className="animate-pulse text-ud-faint">|</span> : "")}
                          {msg.streaming && msg.text && <span className="animate-pulse text-ud-muted">|</span>}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {isPro && (draftList.length > 0 || alertList.length > 0) && (
            <div className="px-5 pb-4 space-y-2.5">
              {draftList.map((draft) => (
                <AriaDraftCard
                  key={draft.id}
                  draft={draft}
                  onApprove={() => handleApproveDraft(draft.id)}
                  onDismiss={() => handleDismissDraft(draft.id)}
                />
              ))}
              {alertList.map((alert) => (
                <AriaAlertCard
                  key={alert.id}
                  alert={alert}
                  onDismiss={() => handleDismissAlert(alert.id)}
                />
              ))}
            </div>
          )}

          <form className="border-t border-ud px-4 py-[14px] flex gap-2.5 items-center" onSubmit={handleSubmit}>
            <input
              className="flex-1 border border-ud rounded-[10px] px-[14px] py-[10px] text-[13.5px] outline-none bg-ud-surface-sunk text-ud-ink focus:border-ud-accent focus:shadow-[0_0_0_3px_rgba(74,63,168,0.08)] focus:bg-ud-surface transition-[border-color,box-shadow,background-color]"
              style={{ fontFamily: "var(--font)" }}
              placeholder={`Ask about your ${customerPlural.toLowerCase()}, ${jobPlural.toLowerCase()}, revenue, or anything else.`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className={btnInk} disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <div className="bg-ud-surface border border-[rgba(0,0,0,0.06)] rounded-[var(--radius-ud-lg)] shadow-ud overflow-hidden">
            <div className="px-[22px] py-4 border-b border-[rgba(0,0,0,0.05)]">
              <p className="text-[13.5px] font-semibold text-ud-ink">Try asking</p>
            </div>
            <div className="p-3 flex flex-col gap-1.5">
              {starterQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="w-full text-left flex items-center gap-[7px] px-[13px] py-2 rounded-[9px] bg-ud-surface border border-ud text-[12.5px] font-semibold text-ud-text cursor-pointer shadow-ud hover:border-ud-hard hover:text-ud-ink transition-[border-color,color] duration-[120ms]"
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
