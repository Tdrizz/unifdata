"use client";

import { useEffect, useId, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { markNotificationsRead } from "@/lib/notifications";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  companyId: string;
  initialNotifications: Notification[];
  variant?: "sidebar" | "header";
}

export function NotificationBell({ companyId, initialNotifications, variant = "sidebar" }: NotificationBellProps) {
  const instanceId = useId();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${companyId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `company_id=eq.${companyId}` },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev]),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, instanceId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = async () => {
    setOpen((prev) => !prev);
    if (!open && unreadCount > 0) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      try {
        await markNotificationsRead(unreadIds);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        // Best-effort — notification read status is cosmetic
      }
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="topbar-btn"
        title="Notifications"
        aria-label="Notifications"
      >
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && <span className="notif-dot" />}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50, width: "300px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "var(--shadow)" }}>
          <div style={{ borderBottom: "1px solid var(--border)", padding: "10px 16px", fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>Notifications</div>
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <p style={{ padding: "24px 16px", textAlign: "center", fontSize: "13px", color: "var(--faint)" }}>No notifications</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div key={n.id} style={{ borderBottom: "1px solid var(--border)", padding: "12px 16px", background: !n.read ? "var(--accent-light)" : undefined }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>{n.title}</p>
                  {n.body && <p style={{ marginTop: "2px", fontSize: "12px", color: "var(--muted)", margin: "2px 0 0" }}>{n.body}</p>}
                  <p style={{ marginTop: "4px", fontSize: "11px", color: "var(--faint)", margin: "4px 0 0" }}>{new Date(n.created_at).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
