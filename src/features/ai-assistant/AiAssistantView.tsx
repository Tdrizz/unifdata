"use client";

import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { PageHeader } from "@/components/ui/PageHeader";

type Message = {
  role: "user" | "model";
  text: string;
};

const STARTER_QUESTIONS = [
  "Which clients haven't had a job in 90+ days?",
  "Summarize this month's revenue by client",
  "Draft a payment reminder for overdue invoices",
  "What's our close rate this quarter?",
];

const btnGhostSm = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms] cursor-pointer";
const btnInk = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-ink text-white hover:opacity-85 transition-opacity duration-[120ms]";

export function AiAssistantView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", text: text.trim() };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessages((prev) => [...prev, { role: "model", text: data.error || "Something went wrong." }]);
        return;
      }

      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "model", text: "Could not reach the server." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="hidden md:block px-7 pb-10 pt-7">
      <PageHeader
        eyebrow="AI Assistant"
        title="Business advisor"
        description="Ask anything about your clients, pipeline, or revenue."
        className="mb-6"
      />

      {/* Grid layout */}
      <div className="grid grid-cols-[1.2fr_0.8fr] gap-5 items-start">
        {/* Chat card */}
        <div className="bg-ud-surface border border-[rgba(0,0,0,0.06)] rounded-[var(--radius-ud-lg)] shadow-ud overflow-hidden flex flex-col">
          <div className="px-[22px] py-4 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between gap-3">
            <p className="text-[13.5px] font-semibold text-ud-ink">Chat</p>
            <button className={btnGhostSm} onClick={() => setMessages([])}>Clear</button>
          </div>

          {/* Chat area */}
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
                <p className={`text-[10.5px] font-bold uppercase tracking-[0.10em] ${msg.role === "user" ? "text-ud-accent" : "text-[#8B80E0]"}`}>
                  {msg.role === "user" ? "You" : "AI Assistant"}
                </p>
                <div className={`rounded-[10px] px-[14px] py-3 text-[13.5px] leading-relaxed ${msg.role === "user" ? "bg-ud-accent-tint border border-[rgba(74,63,168,0.18)] text-ud-text" : "bg-ud-surface-sunk text-ud-text"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex flex-col gap-1">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.10em] text-[#8B80E0]">AI Assistant</p>
                <div className="rounded-[10px] px-[14px] py-3 text-[13.5px] leading-relaxed bg-ud-surface-sunk text-ud-faint">Thinking…</div>
              </div>
            )}
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
          {/* Try asking */}
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
