"use client";

import { useState, useRef, useEffect } from "react";

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

export function AiChat() {
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex flex-col">
      {/* Starter prompts — only shown before first message */}
      {messages.length === 0 && (
        <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-2">
          {STARTER_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => sendMessage(q)}
              className="rounded-[8px] bg-ud-surface-sunk border border-ud px-3 py-2.5 text-left text-[12.5px] text-ud-muted hover:bg-ud-surface-sunk"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Message thread */}
      {messages.length > 0 && (
        <div className="max-h-[480px] space-y-4 overflow-y-auto p-5">
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={
                  message.role === "user"
                    ? "max-w-[80%] bg-[#4A3FA8] text-white px-4 py-2.5 rounded-[18px] rounded-br-md text-[13.5px] leading-[1.55]"
                    : "max-w-[85%] rounded-[10px] border border-ud bg-ud-surface-sunk px-4 py-3 text-[13.5px] leading-[1.55] text-ud-muted"
                }
              >
                {message.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-[10px] border border-ud bg-ud-surface-sunk px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {error && (
        <div className="mx-5 mb-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 border-t border-slate-100 p-4"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your workspace..."
          disabled={loading}
          className="min-w-0 flex-1 rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none placeholder:text-ud-faint focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-[8px] bg-[#4A3FA8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3D3494] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
