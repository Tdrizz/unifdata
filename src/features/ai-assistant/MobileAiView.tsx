"use client";

import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { AiMessage } from "./AiMessage";
import { Composer } from "./Composer";

type Message = {
  role: "user" | "model" | "action";
  text: string;
  streaming?: boolean;
};

const STARTER_QUESTIONS = [
  "Who needs follow-up the most urgently?",
  "Which opportunities have the highest value?",
  "What's my unpaid revenue situation?",
  "Where are my biggest data gaps?",
];

type Props = {
  initialMessages?: Array<{ role: "user" | "model"; text: string }>;
  initialSessionId?: string | null;
};

export function MobileAiView({ initialMessages = [], initialSessionId = null }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

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
        setMessages((prev) => prev.slice(0, -1));
        setError(data.error || "Something went wrong.");
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
      setMessages((prev) => prev.slice(0, -1));
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="relative flex flex-col" style={{ minHeight: "calc(100vh - 60px)" }}>
      {/* Mobile page header */}
      <div className="px-[18px] pt-[18px] pb-[14px] border-b border-ud-soft">
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
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-[14px] py-[14px] flex flex-col gap-[14px]">
        {messages.length === 0 && !loading && (
          <div className="flex flex-wrap gap-2 pt-2">
            {STARTER_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="text-[12.5px] font-medium bg-ud-surface border border-ud rounded-full px-[12px] py-[7px] text-ud-text hover:border-ud-hard hover:bg-ud-surface-soft transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) =>
          message.role === "action" ? (
            <div
              key={index}
              className="rounded-[10px] px-[14px] py-[10px] text-[12.5px] font-medium bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.22)] text-[#16a34a] whitespace-pre-line"
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
                  {message.text}
                  {message.streaming && <span className="animate-pulse text-ud-muted ml-0.5">|</span>}
                </>
              ) : null}
            </AiMessage>
          )
        )}

        {error && (
          <div className="rounded-[10px] border border-ud bg-ud-surface-soft px-[14px] py-[11px] text-[13px] text-ud-danger">
            {error}
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
          placeholder="Ask about your workspace…"
        />
      </div>
    </div>
  );
}
