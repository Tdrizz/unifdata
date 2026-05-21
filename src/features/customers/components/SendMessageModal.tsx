"use client";

import { useState, useTransition, useRef } from "react";
import { sendCustomerMessageAction } from "../actions";
import { haptic } from "@/lib/haptics";

type Props = {
  customerId: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  compact?: boolean;
};

export function SendMessageModal({ customerId, customerName, phone, email, compact = false }: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"sms" | "email">(phone ? "sms" : "email");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [result, setResult] = useState<{ ok?: true; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);

  const canSend = tab === "sms" ? !!phone && body.trim().length > 0 : !!email && body.trim().length > 0;
  const hasNoContact = !phone && !email;

  function reset() {
    setResult(null);
    setBody("");
    setSubject("");
    setTab(phone ? "sms" : "email");
  }

  function handleOpen() {
    haptic("light");
    reset();
    if (compact) {
      setSheetMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetVisible(true)));
    } else {
      setModalOpen(true);
    }
  }

  function handleClose() {
    if (isPending) return;
    if (compact) {
      setSheetVisible(false);
      setDragY(0);
      setTimeout(() => setSheetMounted(false), 320);
    } else {
      setModalOpen(false);
    }
  }

  function handleSend() {
    if (!canSend || isPending) return;
    haptic("medium");
    startTransition(async () => {
      const res = await sendCustomerMessageAction(customerId, tab, body.trim(), subject.trim());
      setResult(res ?? { error: "Unknown error." });
      if (res && "ok" in res) {
        haptic("success");
        setBody("");
        setSubject("");
      } else {
        haptic("error");
      }
    });
  }

  function onDragStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  }
  function onDragMove(e: React.TouchEvent) {
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) setDragY(dy);
  }
  function onDragEnd() {
    setIsDragging(false);
    if (dragY > 100) {
      handleClose();
    } else {
      setDragY(0);
    }
  }

  // Shared form content
  const formContent = (
    <>
      {hasNoContact ? (
        <div style={{ padding: "20px 20px 8px" }}>
          <p style={{ fontSize: "13px", color: "var(--ud-text-muted)", textAlign: "center" }}>
            This customer has no phone number or email address on file. Add contact details first.
          </p>
        </div>
      ) : (
        <>
          {(phone && email) && (
            <div style={{ display: "flex", gap: "6px", padding: "14px 20px 0" }}>
              {phone && (
                <button
                  type="button"
                  onClick={() => { setTab("sms"); setResult(null); }}
                  style={{
                    padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                    border: "1px solid", cursor: "pointer", transition: "background 0.12s, color 0.12s, border-color 0.12s",
                    background: tab === "sms" ? "var(--ud-ink)" : "var(--ud-surface-sunk)",
                    color: tab === "sms" ? "#fff" : "var(--ud-text-muted)",
                    borderColor: tab === "sms" ? "var(--ud-ink)" : "var(--ud-border)",
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
                    padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                    border: "1px solid", cursor: "pointer", transition: "background 0.12s, color 0.12s, border-color 0.12s",
                    background: tab === "email" ? "var(--ud-ink)" : "var(--ud-surface-sunk)",
                    color: tab === "email" ? "#fff" : "var(--ud-text-muted)",
                    borderColor: tab === "email" ? "var(--ud-ink)" : "var(--ud-border)",
                  }}
                >
                  Email
                </button>
              )}
            </div>
          )}

          <div style={{ padding: "14px 20px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontSize: "12px", color: "var(--ud-text-faint)", margin: 0 }}>
              To: {tab === "sms" ? phone : email}
            </p>

            {tab === "email" && (
              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ width: "100%", borderRadius: "10px", border: "1px solid var(--ud-border)", background: "var(--ud-surface-sunk)", padding: "10px 12px", fontSize: "16px", color: "var(--ud-ink)", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
              />
            )}

            <textarea
              placeholder={tab === "sms" ? "Type your message…" : "Message body…"}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={compact ? 4 : 5}
              style={{ width: "100%", borderRadius: "10px", border: "1px solid var(--ud-border)", background: "var(--ud-surface-sunk)", padding: "10px 12px", fontSize: "16px", color: "var(--ud-ink)", resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
            />

            {tab === "sms" && (
              <p style={{ fontSize: "11px", color: "var(--ud-text-faint)", margin: 0 }}>
                {body.length}/160 · SMS via Twilio
              </p>
            )}

            {result && (
              <div style={{
                borderRadius: "10px", padding: "10px 14px", fontSize: "13px",
                background: "ok" in result ? "var(--ud-success-bg)" : "var(--ud-danger-bg)",
                color: "ok" in result ? "var(--ud-success)" : "var(--ud-danger)",
                border: `1px solid ${"ok" in result ? "var(--ud-success)" : "var(--ud-danger)"}`,
              }}>
                {"ok" in result ? "Message sent." : result.error}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              {!compact && (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  style={{ padding: "9px 16px", borderRadius: "10px", border: "1px solid var(--ud-border)", background: "var(--ud-surface)", color: "var(--ud-text-muted)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend || isPending}
                style={{
                  flex: compact ? 1 : undefined,
                  padding: compact ? "13px 18px" : "9px 18px",
                  borderRadius: "12px", border: "none",
                  fontSize: compact ? "15px" : "13px",
                  fontWeight: 600,
                  cursor: canSend && !isPending ? "pointer" : "not-allowed",
                  transition: "opacity 0.12s",
                  background: canSend && !isPending ? "var(--ud-accent)" : "var(--ud-surface-sunk)",
                  color: canSend && !isPending ? "#fff" : "var(--ud-text-faint)",
                }}
              >
                {isPending ? "Sending…" : `Send ${tab === "sms" ? "text" : "email"}`}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* ── Trigger ────────────────────────────────────────────────────── */}
      {compact ? (
        <button
          type="button"
          onClick={handleOpen}
          className="flex flex-col items-center gap-1 w-full h-full"
        >
          <span className="text-ud-accent">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
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

      {/* ── Bottom sheet (mobile / compact) ────────────────────────────── */}
      {compact && sheetMounted && (
        <>
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.5)",
              opacity: sheetVisible ? 1 : 0,
              transition: "opacity 280ms ease",
            }}
            onClick={handleClose}
          />
          <div
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1001,
              background: "var(--ud-surface)",
              borderRadius: "20px 20px 0 0",
              paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
              maxHeight: "90dvh",
              overflowY: "auto",
              overscrollBehavior: "contain",
              transform: isDragging
                ? `translateY(${dragY}px)`
                : sheetVisible ? "translateY(0)" : "translateY(100%)",
              transition: isDragging ? "none" : "transform 320ms cubic-bezier(0.16,1,0.3,1)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* Drag handle */}
            <div
              style={{ display: "flex", justifyContent: "center", paddingTop: 14, paddingBottom: 8, touchAction: "none" }}
              onTouchStart={onDragStart}
              onTouchMove={onDragMove}
              onTouchEnd={onDragEnd}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--ud-border-hard)" }} />
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 4px" }}>
              <div>
                <p style={{ fontSize: "17px", fontWeight: 700, color: "var(--ud-ink)", margin: 0, letterSpacing: "-0.015em" }}>Send message</p>
                <p style={{ fontSize: "13px", color: "var(--ud-text-muted)", margin: "2px 0 0" }}>{customerName}</p>
              </div>
            </div>

            {formContent}
          </div>
        </>
      )}

      {/* ── Centered modal (desktop) ────────────────────────────────────── */}
      {!compact && modalOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", animation: "fade-in 160ms ease both" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div style={{ background: "var(--ud-surface)", borderRadius: "16px", padding: "0", maxWidth: "480px", width: "100%", boxShadow: "var(--ud-shadow-pop)", overflow: "hidden", animation: "modal-enter 160ms cubic-bezier(0.16,1,0.3,1) both" }}>
            {/* Desktop header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--ud-ink)", margin: 0 }}>Send message</p>
                <p style={{ fontSize: "12px", color: "var(--ud-text-muted)", margin: "2px 0 0" }}>{customerName}</p>
              </div>
              <button type="button" onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--ud-text-faint)", lineHeight: 1 }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            {formContent}
          </div>
        </div>
      )}
    </>
  );
}
