"use client";

import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { PageHeader } from "@/components/ui/PageHeader";

type Message = {
  role: "user" | "model" | "action";
  text: string;
  streaming?: boolean;
};

const STARTER_QUESTIONS = [
  "Which clients haven't had a job in 90+ days?",
  "Summarize this month's revenue by client",
  "Draft a payment reminder for overdue invoices",
  "What's our close rate this quarter?",
];

const btnGhostSm = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms] cursor-pointer";
const btnInk = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-ink text-white hover:opacity-85 transition-opacity duration-[120ms]";

type Props = {
  initialMessages?: Array<{ role: "user" | "model"; text: string }>;
  initialSessionId?: string | null;
};

export function AiAssistantView({ initialMessages = [], initialSessionId = null }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
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
    <div className="hidden md:block px-7 pb-10 pt-7">
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
            <button className={btnGhostSm} onClick={handleClear}>New conversation</button>
          </div>

          <div className="flex flex-col gap-3.5 p-[18px_20px] min-h-[300px]">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col gap-1">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.10em] text-[#8B80E0]">AI Assistant</p>
                <div className="rounded-[10px] px-[14px] py-3 text-[13.5px] leading-relaxed bg-ud-surface-sunk text-ud-text">
                  Hello! I can help you analyze your clients, pipeline, revenue, and follow-ups. What would you like to know?
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="flex flex-col gap-1">
                {msg.role === "action" ? (
                  <div className="rounded-[10px] px-[14px] py-2.5 text-[12.5px] font-medium bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.22)] text-[#16a34a] whitespace-pre-line">
                    {msg.text}
                  </div>
                ) : (
                  <>
                    <p className={`text-[10.5px] font-bold uppercase tracking-[0.10em] ${msg.role === "user" ? "text-ud-accent" : "text-[#8B80E0]"}`}>
                      {msg.role === "user" ? "You" : "AI Assistant"}
                    </p>
                    <div className={`rounded-[10px] px-[14px] py-3 text-[13.5px] leading-relaxed ${msg.role === "user" ? "bg-ud-accent-tint border border-[rgba(74,63,168,0.18)] text-ud-text" : "bg-ud-surface-sunk text-ud-text"}`}>
                      {msg.text || (msg.streaming ? <span className="animate-pulse text-ud-faint">|</span> : "")}
                      {msg.streaming && msg.text && <span className="animate-pulse text-ud-muted">|</span>}
                    </div>
                  </>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          <form className="border-t border-ud px-4 py-[14px] flex gap-2.5 items-center" onSubmit={handleSubmit}>
            <input
              className="flex-1 border border-ud rounded-[10px] px-[14px] py-[10px] text-[13.5px] outline-none bg-ud-surface-sunk text-ud-ink focus:border-ud-accent focus:shadow-[0_0_0_3px_rgba(74,63,168,0.08)] focus:bg-ud-surface transition-[border-color,box-shadow,background-color]"
              style={{ fontFamily: "var(--font)" }}
              placeholder="Ask about your business…"
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
              {STARTER_QUESTIONS.map((q) => (
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
