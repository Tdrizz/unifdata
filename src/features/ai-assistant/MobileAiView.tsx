"use client";

import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { AiMessage } from "./AiMessage";
import { Composer } from "./Composer";

type Message = {
  role: "user" | "model";
  text: string;
};

const STARTER_QUESTIONS = [
  "Who needs follow-up the most urgently?",
  "Which opportunities have the highest value?",
  "What's my unpaid revenue situation?",
  "Where are my biggest data gaps?",
];

export function MobileAiView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", text: text.trim() };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
    } catch {
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
          {/* Accent tile */}
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
        {/* Starter chips — only when no messages */}
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

        {/* Messages */}
        {messages.map((message, index) => (
          <AiMessage
            key={index}
            role={message.role === "user" ? "user" : "ai"}
          >
            {message.text}
          </AiMessage>
        ))}

        {/* Loading */}
        {loading && (
          <AiMessage role="ai" isLoading>
            {null}
          </AiMessage>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-[10px] border border-ud bg-ud-surface-soft px-[14px] py-[11px] text-[13px] text-ud-danger">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer — positioned above mobile tab bar */}
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
