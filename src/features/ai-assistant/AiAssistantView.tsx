"use client";

import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { AiMessage } from "./AiMessage";
import { Composer } from "./Composer";
import { cn } from "@/lib/utils";

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

export function AiAssistantView() {
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
    <div className="px-6 pt-5 pb-8 grid grid-cols-1 gap-[24px] items-start xl:grid-cols-[1fr_320px]">
      {/* Left: Chat card */}
      <Card radius="lg" padding={0} className="flex flex-col min-h-[600px]">
        {/* Thread */}
        <div className="flex-1 px-[22px] py-[20px] flex flex-col gap-[16px] overflow-y-auto max-h-[600px]">
          {/* Starter prompts — only shown before first message */}
          {messages.length === 0 && !loading && (
            <div className="flex-1 flex flex-col justify-end gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ud-muted">
                Try asking
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="rounded-[10px] bg-ud-surface-soft border border-ud px-[14px] py-[11px] text-left text-[13px] text-ud-text hover:border-ud-hard hover:bg-ud-surface-sunk transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message thread */}
          {messages.map((message, index) => (
            <AiMessage
              key={index}
              role={message.role === "user" ? "user" : "ai"}
            >
              {message.text}
            </AiMessage>
          ))}

          {/* Loading indicator */}
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

        {/* Composer at bottom */}
        <Composer
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={loading}
          className="rounded-b-[14px]"
        />
      </Card>

      {/* Right: Suggestions + info */}
      <div className="flex flex-col gap-[16px]">
        {/* Suggestions */}
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ud-muted mb-[10px]">
            Suggestions
          </p>
          <div className="flex flex-col gap-[8px]">
            {STARTER_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className={cn(
                  "w-full rounded-[10px] bg-ud-surface border border-ud px-[14px] py-[11px]",
                  "text-left text-[13px] text-ud-text shadow-ud",
                  "hover:border-ud-hard hover:bg-ud-surface-soft transition-colors",
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Info card */}
        <Card padding={16} className="flex flex-col gap-[10px]">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ud-muted">
            What Gemini reads
          </p>
          {[
            "Customers & contacts",
            "Open opportunities",
            "Active jobs",
            "Revenue & invoices",
            "Follow-ups & reminders",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="h-[6px] w-[6px] rounded-full bg-ud-accent shrink-0" />
              <p className="text-[12.5px] text-ud-text">{item}</p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
