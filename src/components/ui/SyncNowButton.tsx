"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function SyncNowButton({ provider, label }: { provider: string; label: string }) {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setSyncing(true);
    try {
      const response = await fetch(`/api/integrations/sync/${provider}`, { method: "POST" });
      const data = await response.json() as {
        contactsTouched?: number;
        recordsImported?: number;
        recordsFailed?: number;
        error?: string;
      };

      if (!response.ok) {
        toast.error(data.error ?? `${label} sync failed`);
        return;
      }

      const contacts = data.contactsTouched ?? 0;
      const records = data.recordsImported ?? 0;
      const failed = data.recordsFailed ?? 0;

      // The records are in the app now, not parked awaiting review, so say so
      // and land on the page where they actually show up.
      toast.success(
        `${label} synced — ${contacts} contact${contacts === 1 ? "" : "s"}, ` +
          `${records} record${records === 1 ? "" : "s"} imported` +
          (failed > 0 ? ` (${failed} couldn't be imported)` : ""),
      );
      router.push("/customers");
    } catch {
      toast.error(`Something went wrong syncing ${label}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={syncing}
      className="flex items-center gap-2 rounded-[8px] border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-sunk disabled:cursor-not-allowed disabled:opacity-60"
    >
      {syncing && (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ud-faint border-t-transparent" />
      )}
      {syncing ? "Syncing…" : "Sync now"}
    </button>
  );
}
