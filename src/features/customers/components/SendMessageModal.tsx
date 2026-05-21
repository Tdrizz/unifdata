"use client";

import { useState, useTransition } from "react";
import { sendCustomerMessageAction } from "../actions";

type Props = {
  customerId: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  compact?: boolean;
};

export function SendMessageModal({ customerId, customerName, phone, email, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"sms" | "email">(phone ? "sms" : "email");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [result, setResult] = useState<{ ok?: true; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSend = tab === "sms" ? !!phone && body.trim().length > 0 : !!email && body.trim().length > 0;
  const hasNoContact = !phone && !email;

  function handleOpen() {
    setOpen(true);
    setResult(null);
    setBody("");
    setSubject("");
    setTab(phone ? "sms" : "email");
  }

  function handleClose() {
    if (isPending) return;
    setOpen(false);
  }

  function handleSend() {
    if (!canSend || isPending) return;
    startTransition(async () => {
      const res = await sendCustomerMessageAction(customerId, tab, body.trim(), subject.trim());
      setResult(res ?? { error: "Unknown error." });
      if (res && "ok" in res) {
        setBody("");
        setSubject("");
      }
    });
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={handleOpen}
          className="flex flex-col items-center gap-1 w-full h-full"
        >
          <span className="text-ud-accent">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <span className="text-[10.5px] font-semibold text-ud-muted">Message</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-2 rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-text shadow-ud hover:bg-ud-surface-sunk transition-colors"
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="text-ud-accent">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Send message
        </button>
      )}

      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", animation: "fade-in 160ms ease both" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div style={{ background: "var(--ud-surface)", borderRadius: "16px", padding: "0", maxWidth: "480px", width: "100%", boxShadow: "var(--ud-shadow-pop)", overflow: "hidden", animation: "modal-enter 160ms cubic-bezier(0.16,1,0.3,1) both" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>Send message</p>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0" }}>{customerName}</p>
              </div>
              <button type="button" onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--faint)", lineHeight: 1 }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {hasNoContact ? (
              <div style={{ padding: "24px" }}>
                <p style={{ fontSize: "13px", color: "var(--muted)", textAlign: "center" }}>
                  This customer has no phone number or email address on file. Add contact details first.
                </p>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div style={{ display: "flex", gap: "4px", padding: "16px 24px 0" }}>
                  {phone && (
                    <button
                      type="button"
                      onClick={() => { setTab("sms"); setResult(null); }}
                      style={{
                        padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, border: "1px solid", cursor: "pointer", transition: "all 0.12s",
                        background: tab === "sms" ? "var(--ink)" : "var(--surface-sunk)",
                        color: tab === "sms" ? "#fff" : "var(--muted)",
                        borderColor: tab === "sms" ? "var(--ink)" : "var(--border)",
                      }}
                    >
                      Text (SMS)
                    </button>
                  )}
                  {email && (
                    <button
                      type="button"
                      onClick={() => { setTab("email"); setResult(null); }}
                      style={{
                        padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, border: "1px solid", cursor: "pointer", transition: "all 0.12s",
                        background: tab === "email" ? "var(--ink)" : "var(--surface-sunk)",
                        color: tab === "email" ? "#fff" : "var(--muted)",
                        borderColor: tab === "email" ? "var(--ink)" : "var(--border)",
                      }}
                    >
                      Email
                    </button>
                  )}
                </div>

                {/* Body */}
                <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ fontSize: "12px", color: "var(--faint)", margin: 0 }}>
                    To: {tab === "sms" ? phone : email}
                  </p>

                  {tab === "email" && (
                    <input
                      type="text"
                      placeholder="Subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      style={{ width: "100%", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--surface-sunk)", padding: "10px 12px", fontSize: "13px", color: "var(--ink)", boxSizing: "border-box", outline: "none" }}
                    />
                  )}

                  <textarea
                    placeholder={tab === "sms" ? "Type your message…" : "Message body…"}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={5}
                    style={{ width: "100%", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--surface-sunk)", padding: "10px 12px", fontSize: "13px", color: "var(--ink)", resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
                  />

                  {tab === "sms" && (
                    <p style={{ fontSize: "11px", color: "var(--faint)", margin: 0 }}>
                      {body.length}/160 characters · SMS via Twilio
                    </p>
                  )}

                  {result && (
                    <div style={{
                      borderRadius: "10px", padding: "10px 14px", fontSize: "13px",
                      background: "ok" in result ? "var(--success-bg, #f0fdf4)" : "#fef2f2",
                      color: "ok" in result ? "var(--success, #16a34a)" : "#dc2626",
                      border: `1px solid ${"ok" in result ? "var(--success-border, #bbf7d0)" : "#fecaca"}`,
                    }}>
                      {"ok" in result ? "Message sent." : result.error}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isPending}
                      style={{ padding: "9px 16px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--muted)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!canSend || isPending}
                      style={{
                        padding: "9px 18px", borderRadius: "10px", border: "none", fontSize: "13px", fontWeight: 600, cursor: canSend && !isPending ? "pointer" : "not-allowed", transition: "opacity 0.12s",
                        background: canSend && !isPending ? "var(--accent)" : "var(--surface-sunk)",
                        color: canSend && !isPending ? "#fff" : "var(--faint)",
                      }}
                    >
                      {isPending ? "Sending…" : `Send ${tab === "sms" ? "text" : "email"}`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
