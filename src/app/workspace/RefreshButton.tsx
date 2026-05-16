"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    // Reset after a moment — router.refresh() has no callback
    setTimeout(() => setRefreshing(false), 1000);
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={refreshing}
      className="rounded-[10px] border border-ud bg-ud-surface px-4 py-2.5 text-[13px] font-semibold text-ud-ink hover:bg-ud-surface-soft disabled:opacity-50 transition-colors"
    >
      {refreshing ? "Refreshing..." : "Refresh"}
    </button>
  );
}
