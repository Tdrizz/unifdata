"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { ProposalRow, FieldDelta } from "@/lib/data-keeper/types";

type Props = {
  initialProposals: ProposalRow[];
};

function fieldLabel(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Primary ", "");
}

// An update to a record that already exists -- applying this overwrites
// that record's field with the new value, so showing the change as a real
// diff is accurate.
function FieldDiffRow({ field, from, to }: { field: string; from: unknown; to: unknown }) {
  const fromStr = from === null || from === undefined || from === "" ? "(empty)" : String(from);
  const toStr = to === null || to === undefined || to === "" ? "(empty)" : String(to);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px] leading-relaxed">
      <span className="font-medium text-ud-muted min-w-[80px]">{fieldLabel(field)}:</span>
      <span className="text-ud-faint line-through">{fromStr}</span>
      <span className="text-ud-faint">→</span>
      <span className="font-medium text-ud-ink">{toStr}</span>
    </div>
  );
}

// A proposal with no target_record_id doesn't match anyone confidently
// enough to update -- approving it creates a brand-new contact instead. The
// "from" side of its field delta is the closest existing contact's value,
// shown for context on why it was surfaced, not something that's about to
// be overwritten -- rendering it as a from→to diff (as the update case
// does) falsely implies an existing contact is being changed.
function NewRecordFieldRow({ field, value }: { field: string; value: unknown }) {
  const valueStr = value === null || value === undefined || value === "" ? "(empty)" : String(value);
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px] leading-relaxed">
      <span className="font-medium text-ud-muted min-w-[80px]">{fieldLabel(field)}:</span>
      <span className="font-medium text-ud-ink">{valueStr}</span>
    </div>
  );
}

function ProposalRow({
  proposal,
  onRemove,
}: {
  proposal: ProposalRow;
  onRemove: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const updates = (proposal.proposed_changes?.updates ?? {}) as FieldDelta;
  const hasDiff = Object.keys(updates).length > 0;
  // No target means the match wasn't confident enough to update anyone --
  // approving this creates a new contact rather than changing an existing
  // one (see api/v1/proposals/[id]/approve/route.ts's branch on this same
  // field).
  const isNewRecord = !proposal.target_record_id;

  async function act(action: "approve" | "reject") {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/proposals/${proposal.id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        toast.error(body.error ?? "Action failed. Try again.");
        setBusy(false);
        return;
      }
      toast.success(action === "approve" ? "Suggestion applied" : "Suggestion dismissed");
      onRemove(proposal.id);
    } catch {
      toast.error("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="px-4 py-[14px] border-b border-ud-soft last:border-0">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {isNewRecord ? (
          <span className="text-[12.5px] font-semibold text-ud-ink">New contact suggested</span>
        ) : (
          <>
            <span className="text-[12.5px] font-semibold text-ud-ink">
              {Math.round(proposal.confidence_score * 100)}% confidence match
            </span>
            {proposal.target_table === "master_customers" && proposal.target_record_id && (
              <Link
                href={`/customers/${proposal.target_record_id}`}
                className="text-[12px] font-medium text-ud-accent hover:underline"
              >
                View contact
              </Link>
            )}
          </>
        )}
      </div>

      {hasDiff && (
        <div className="space-y-1 mb-2.5">
          {isNewRecord && (
            <p className="text-[11.5px] text-ud-faint mb-1">
              Didn&apos;t confidently match an existing contact — approving creates a new one:
            </p>
          )}
          {Object.entries(updates)
            .filter(([f]) => !f.startsWith("metadata."))
            .slice(0, 4)
            .map(([field, change]) =>
              isNewRecord ? (
                <NewRecordFieldRow key={field} field={field} value={change.to} />
              ) : (
                <FieldDiffRow key={field} field={field} from={change.from} to={change.to} />
              )
            )}
        </div>
      )}

      <p className="text-[12px] text-ud-muted italic leading-relaxed mb-3">
        {proposal.raw_reasoning.length > 160
          ? proposal.raw_reasoning.slice(0, 157) + "…"
          : proposal.raw_reasoning}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => act("approve")}
          disabled={busy}
          className="rounded-[8px] bg-ud-accent px-3 py-[7px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Applying…" : "Apply"}
        </button>
        <button
          type="button"
          onClick={() => act("reject")}
          disabled={busy}
          className="rounded-[8px] border border-ud px-3 py-[7px] text-[12px] font-semibold text-ud-muted transition-colors hover:border-ud-hard hover:text-ud-ink disabled:opacity-40"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function ProposalsWidget({ initialProposals }: Props) {
  const [proposals, setProposals] = useState(initialProposals);

  function remove(id: string) {
    setProposals((prev) => prev.filter((p) => p.id !== id));
  }

  if (proposals.length === 0) return null;

  return (
    <div className="mx-4 md:mx-0 mb-5 bg-ud-surface border border-ud rounded-[12px] overflow-hidden">
      <div className="px-4 py-[14px] border-b border-ud-soft">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-ud-ink">Suggestions pending review</p>
          <span className="shrink-0 rounded-full bg-ud-warning px-2 py-[1px] text-[11px] font-semibold text-white">
            {proposals.length}
          </span>
        </div>
        <p className="text-[12px] text-ud-muted mt-0.5">Review and apply or dismiss each suggestion below.</p>
      </div>
      <div>
        {proposals.map((p) => (
          <ProposalRow key={p.id} proposal={p} onRemove={remove} />
        ))}
      </div>
    </div>
  );
}
