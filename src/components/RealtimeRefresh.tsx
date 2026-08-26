"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type WatchedTable = { table: string; column?: "company_id" | "organization_id" };

// Renders nothing — just keeps a Supabase Realtime subscription open on the
// given tables and calls router.refresh() (debounced) when any row changes.
// Drop one of these into a server-rendered page to make its data live: a
// change from Vera, a background agent run, or another tab/device shows up
// without the user having to reload. Debounced rather than firing per-event
// since a bulk operation (an import, a sweep) can touch many rows at once.
export function RealtimeRefresh({ orgId, tables }: { orgId: string; tables: WatchedTable[] }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = tables.map((t) => `${t.table}:${t.column ?? "company_id"}`).join(",");

  useEffect(() => {
    // The channel topic must be unique per mount, not just per org/table-set.
    // Supabase's client keys channels by topic name -- a fully deterministic
    // name here caused a real production crash: Next.js can mount this tree
    // more than once in quick succession during client-side navigation
    // (e.g. right after the login redirect), and two overlapping mounts
    // racing on the identical topic meant the second one's .on() calls
    // landed on a channel the first had already subscribe()'d to, which
    // Supabase's client throws on synchronously. Thrown inside an effect,
    // that's an uncaught error that took down the whole page's error
    // boundary. A random suffix makes every mount's channel independent.
    let cancelled = false;
    const supabase = createClient();
    const topic = `live:${orgId}:${key}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(topic);

    try {
      for (const { table, column = "company_id" } of tables) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `${column}=eq.${orgId}` },
          () => {
            if (cancelled) return;
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => router.refresh(), 400);
          },
        );
      }
      channel.subscribe();
    } catch (err) {
      // Live updates are a nice-to-have -- a subscription setup failure
      // must never crash the page.
      console.error("[RealtimeRefresh] subscribe failed:", err);
    }

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, key]);

  return null;
}
