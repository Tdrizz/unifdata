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
    const supabase = createClient();
    const channel = supabase.channel(`live:${orgId}:${key}`);

    for (const { table, column = "company_id" } of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `${column}=eq.${orgId}` },
        () => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => router.refresh(), 400);
        },
      );
    }

    channel.subscribe();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, key]);

  return null;
}
