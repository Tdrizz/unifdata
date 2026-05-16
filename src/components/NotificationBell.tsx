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
  }, [companyId]);

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
      await markNotificationsRead(unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className={`relative rounded-full p-2 ${variant === "sidebar" ? "hover:bg-white/10" : "hover:bg-slate-100"}`}
        aria-label="Notifications"
      >
        <svg className={`h-5 w-5 ${variant === "sidebar" ? "text-white" : "text-slate-700"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 max-w-[calc(100vw-1rem)] rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2 text-sm font-medium text-slate-900">Notifications</div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div key={n.id} className={`border-b border-slate-100 px-4 py-3 last:border-0 ${!n.read ? "bg-[rgba(74,63,168,0.06)]" : ""}`}>
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                  <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
