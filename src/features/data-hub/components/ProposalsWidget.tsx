"use client";

import { useState } from "react";
import type { ProposalRow, FieldDelta } from "@/lib/data-keeper/types";

type Props = {
  initialProposals: ProposalRow[];
};

function FieldDiffRow({ field, from, to }: { field: string; from: unknown; to: unknown }) {
  const label = field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Primary ", "");

  const fromStr = from === null || from === undefined || from === "" ? "(empty)" : String(from);
  const toStr = to === null || to === undefined || to === "" ? "(empty)" : String(to);

  return (
    <div className="queue-meta" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      <span style={{ fontWeight: 500, minWidth: "90px" }}>{label}:</span>
      <span style={{ opacity: 0.55, textDecoration: "line-through" }}>{fromStr}</span>
      <span style={{ opacity: 0.4 }}>→</span>
      <span style={{ fontWeight: 500 }}>{toStr}</span>
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

  async function act(action: "approve" | "reject") {
    setBusy(true);
    try {
      await fetch(`/api/v1/proposals/${proposal.id}/${action}`, { method: "POST" });
      onRemove(proposal.id);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="queue-item">
      <div className="queue-dot queue-dot-warning" />
      <div className="queue-body" style={{ flex: 1 }}>
        <div className="queue-action" style={{ marginBottom: "4px" }}>
          {Math.round(proposal.confidence_score * 100)}% confidence match
        </div>

        {hasDiff && (
          <div style={{ marginBottom: "6px" }}>
            {Object.entries(updates)
              .filter(([f]) => !f.startsWith("metadata."))
              .slice(0, 4)
              .map(([field, change]) => (
                <FieldDiffRow
                  key={field}
                  field={field}
                  from={change.from}
                  to={change.to}
                />
              ))}
          </div>
        )}

        <div className="queue-meta" style={{ fontStyle: "italic" }}>
          {proposal.raw_reasoning.length > 160
            ? proposal.raw_reasoning.slice(0, 157) + "…"
            : proposal.raw_reasoning}
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => act("approve")}
          disabled={busy}
        >
          Apply
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => act("reject")}
          disabled={busy}
          style={{ opacity: 0.6 }}
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
    <div className="card" style={{ marginBottom: "20px" }}>
      <div className="card-header">
        <div>
          <div className="card-title">
            Suggestions pending review
            <span
              style={{
                marginLeft: "8px",
                background: "var(--color-warning, #f59e0b)",
                color: "#fff",
                borderRadius: "10px",
                padding: "1px 7px",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              {proposals.length}
            </span>
          </div>
          <div className="card-desc">
            Review and apply or dismiss each suggestion below.
          </div>
        </div>
      </div>
      <div>
        {proposals.map((p) => (
          <ProposalRow key={p.id} proposal={p} onRemove={remove} />
        ))}
      </div>
    </div>
  );
}
