"use client";

import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";

type Message = {
  role: "user" | "model";
  text: string;
};

const RECENT_CONVERSATIONS = [
  { label: "Which clients haven't had a job in 90+ days?", meta: "Yesterday · 8:43 AM" },
  { label: "Summarize April revenue by client", meta: "May 13 · 11:02 AM" },
  { label: "Draft a re-engagement email for Derek Morrison", meta: "May 9 · 3:18 PM" },
  { label: "What's our close rate this quarter?", meta: "May 7 · 9:55 AM" },
];

const STARTER_QUESTIONS = [
  "Which clients haven't had a job in 90+ days?",
  "Summarize this month's revenue by client",
  "Draft a payment reminder for overdue invoices",
  "What's our close rate this quarter?",
];

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
    <div className="hidden md:block" style={{ padding: "28px 28px 40px" }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">AI Assistant</div>
          <div className="page-title">Business advisor</div>
          <div className="page-desc">Ask anything about your clients, pipeline, or revenue.</div>
        </div>
      </div>

      {/* Grid layout */}
      <div className="grid-2">
        {/* Chat card */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="card-header">
            <div className="card-title">Chat</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setMessages([])}>Clear</button>
          </div>

          <div className="chat-area">
            {messages.length === 0 && !loading && (
              <div className="chat-msg">
                <div className="chat-msg-label ai">AI Assistant</div>
                <div className="chat-bubble ai">
                  Hello! I can help you analyze your clients, pipeline, revenue, and follow-ups. What would you like to know?
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="chat-msg">
                <div className={`chat-msg-label ${msg.role === "user" ? "user" : "ai"}`}>
                  {msg.role === "user" ? "You" : "AI Assistant"}
                </div>
                <div className={`chat-bubble ${msg.role === "user" ? "user" : "ai"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg">
                <div className="chat-msg-label ai">AI Assistant</div>
                <div className="chat-bubble ai" style={{ color: "var(--faint)" }}>Thinking…</div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <form className="chat-input-bar" onSubmit={handleSubmit}>
            <input
              className="chat-input"
              placeholder="Ask about your business…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-ink" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>

        {/* Right column */}
        <div className="col-stack">
          {/* Recent conversations */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent conversations</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setMessages([])}>New chat</button>
            </div>
            <div>
              {RECENT_CONVERSATIONS.map((conv, i) => (
                <div
                  key={i}
                  className="queue-item"
                  style={{ cursor: "pointer" }}
                  onClick={() => sendMessage(conv.label)}
                >
                  <div className="queue-body">
                    <div className="queue-action" style={{ fontSize: "13px" }}>{conv.label}</div>
                    <div className="queue-meta">{conv.meta}</div>
                  </div>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" style={{ color: "var(--faint)", flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Try asking */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Try asking</div>
            </div>
            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {STARTER_QUESTIONS.map((q) => (
                <div
                  key={q}
                  className="quick-action"
                  style={{ width: "100%", justifyContent: "flex-start", cursor: "pointer" }}
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
