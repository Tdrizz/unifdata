"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type OrphanGroup = {
  customer_id: string;
  customer_name: string;
  jobs: { id: string; service_type: string | null }[];
  suggested_lead: { id: string; service_requested: string | null } | null;
};

export function OrphanQuickLink({ groups }: { groups: OrphanGroup[] }) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const actionableGroups = groups.filter((g) => g.suggested_lead !== null);

  if (actionableGroups.length === 0 || dismissed) {
    return null;
  }

  async function applyAll() {
    setApplying(true);
    setMessage("");

    const suggestions = actionableGroups.flatMap((group) =>
      group.jobs.map((job) => ({
        table: "jobs" as const,
        record_id: job.id,
        field: "lead_id" as const,
        value: group.suggested_lead!.id,
      })),
    );

    try {
      const response = await fetch("/api/link-suggestions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to apply links.");
        return;
      }

      setMessage(`Linked ${data.appliedCount} job${data.appliedCount !== 1 ? "s" : ""} to opportunities.`);
      router.refresh();
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setApplying(false);
    }
  }

  const totalJobs = actionableGroups.reduce((sum, g) => sum + g.jobs.length, 0);

  return (
    <div className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ud-ink">
            Quick link — jobs without opportunities
          </p>
          <p className="mt-1 text-sm text-ud-muted">
            {totalJobs} job{totalJobs !== 1 ? "s" : ""} across {actionableGroups.length} customer{actionableGroups.length !== 1 ? "s" : ""} can be linked to existing opportunities.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-ud-faint hover:text-slate-600"
          >
            Dismiss
          </button>

          <button
            type="button"
            disabled={applying}
            onClick={applyAll}
            className="rounded-[8px] bg-ud-accent px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {applying ? "Linking..." : `Link all ${totalJobs}`}
          </button>
        </div>
      </div>

      {message && (
        <p className="mt-3 text-sm font-semibold text-[#4A3FA8]">{message}</p>
      )}

      <div className="mt-4 divide-y divide-slate-100">
        {actionableGroups.slice(0, 5).map((group) => (
          <div key={group.customer_id} className="py-3">
            <p className="text-sm font-semibold text-ud-ink">{group.customer_name}</p>
            <p className="mt-0.5 text-xs text-[#4A3FA8] font-medium">
              {group.jobs.length} job{group.jobs.length !== 1 ? "s" : ""} → {group.suggested_lead!.service_requested ?? "Opportunity"}
            </p>
            <p className="mt-0.5 text-xs text-ud-faint">These jobs and opportunities share the same customer — linking them connects your data automatically.</p>
          </div>
        ))}

        {actionableGroups.length > 5 && (
          <p className="pt-3 text-xs text-ud-faint">
            +{actionableGroups.length - 5} more customer groups
          </p>
        )}
      </div>
    </div>
  );
}
