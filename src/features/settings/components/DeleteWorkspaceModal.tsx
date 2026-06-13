"use client";

import { useState, useTransition } from "react";
import { deleteWorkspaceAction } from "../actions";

type Props = {
  companyName: string;
};

export function DeleteWorkspaceModal({ companyName }: Props) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirmed = confirm.trim() === companyName.trim();

  function handleDelete() {
    if (!confirmed) return;
    setDeleteError(null);
    startTransition(async () => {
      try {
        await deleteWorkspaceAction();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Delete failed. Please try again.";
        if (!msg.includes("NEXT_REDIRECT")) {
          setDeleteError(msg);
        }
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-[11px] py-[5px] rounded-[7px] border border-ud-danger/30 bg-transparent text-ud-danger text-[12px] font-semibold shrink-0 cursor-pointer"
      >
        Delete workspace
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.45)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: "24px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            background: "var(--surface)", borderRadius: "14px",
            padding: "28px", maxWidth: "480px", width: "100%",
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#dc2626", marginBottom: "12px" }}>
              Delete workspace
            </div>

            <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: "1.6", marginBottom: "20px" }}>
              <p style={{ marginBottom: "12px" }}>
                <strong style={{ color: "var(--ink)" }}>This will permanently delete your workspace.</strong> Once confirmed, the following data will be erased and cannot be recovered:
              </p>
              <ul style={{ paddingLeft: "18px", marginBottom: "12px" }}>
                <li>All customers and contact history</li>
                <li>All jobs, quotes, and sales records</li>
                <li>All leads and pipeline activity</li>
                <li>All team members and access</li>
                <li>All integrations and API keys</li>
              </ul>
              <p>
                <strong style={{ color: "var(--ink)" }}>Next steps after deletion:</strong> You will be signed out immediately. If you need a data export before deleting, contact{" "}
                <a href="mailto:support@frontierops.io" style={{ color: "var(--accent)" }}>support@frontierops.io</a> first.
              </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label className="form-label" style={{ marginBottom: "6px", display: "block" }}>
                Type <strong>{companyName}</strong> to confirm
              </label>
              <input
                type="text"
                className="form-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={companyName}
                autoFocus
              />
            </div>

            {deleteError && (
              <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "13px" }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 rounded-[9px] bg-ud-surface border border-ud text-ud-muted text-[13px] font-semibold hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms] cursor-pointer"
                onClick={() => { setOpen(false); setConfirm(""); setDeleteError(null); }}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!confirmed || isPending}
                className="inline-flex items-center px-3 py-2 rounded-[9px] text-[13px] font-semibold border-0"
                style={{
                  background: confirmed ? "#dc2626" : "var(--surface-sunk)",
                  color: confirmed ? "#fff" : "var(--faint)",
                  cursor: confirmed ? "pointer" : "not-allowed",
                }}
              >
                {isPending ? "Deleting…" : "Delete workspace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
