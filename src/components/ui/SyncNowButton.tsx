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
      const data = await response.json() as { recordsStaged?: number; error?: string };

      if (!response.ok) {
        toast.error(data.error ?? `${label} sync failed`);
        return;
      }

      toast.success(`${label} sync complete — ${data.recordsStaged ?? 0} records staged for review`);
      router.push("/imports");
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
