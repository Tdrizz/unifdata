"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateOnly, isTodayOrPast } from "@/lib/date-format";
import { formatCurrency } from "@/lib/utils";
import { getOpportunityTone } from "@/lib/status";
import { OPPORTUNITY_STATUSES } from "@/lib/constants";
import { bulkUpdateLeadsStatus } from "../actions";
import type { LeadRow, CustomerRow } from "../types";

type Props = {
  leads: LeadRow[];
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  profile: { labels: { customerSingular: string } };
  sectionTitle: string;
};

function getFollowUpText(date: string | null) {
  if (!date) return "No follow-up";
  if (isTodayOrPast(date)) return `Due ${formatDateOnly(date)}`;
  return `Follow up ${formatDateOnly(date)}`;
}

function getFollowUpTone(date: string | null) {
  if (!date) return "warning" as const;
  if (isTodayOrPast(date)) return "danger" as const;
  return "neutral" as const;
}

export function LeadsTableClient({ leads, customers, sectionTitle }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const allSelected = leads.length > 0 && selected.size === leads.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = () => {
    if (!bulkStatus) return;
    startTransition(async () => {
      await bulkUpdateLeadsStatus(Array.from(selected), bulkStatus);
      setSelected(new Set());
      setBulkStatus("");
    });
  };

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-sm text-slate-600">{selected.size} selected</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          >
            <option value="">Change status to…</option>
            {OPPORTUNITY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={handleApply}
            disabled={isPending || !bulkStatus}
            className="rounded-lg bg-[#4A3FA8] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#3D3494] disabled:opacity-50"
          >
            {isPending
              ? "Applying…"
              : `Apply to selected (${selected.size})`}
          </button>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {/* Select-all header row */}
        <div className="flex items-center gap-3 px-4 py-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            aria-label={`Select all ${sectionTitle}`}
            className="rounded"
          />
          <span className="text-xs font-medium text-slate-500">
            {allSelected ? "Deselect all" : "Select all"}
          </span>
        </div>

        {leads.map((opportunity) => {
          const customer = opportunity.customer_id
            ? customerById.get(opportunity.customer_id)
            : null;

          return (
            <div
              key={opportunity.id}
              className="flex items-start gap-3 p-4 transition-colors hover:bg-slate-50"
            >
              <div className="pt-1">
                <input
                  type="checkbox"
                  checked={selected.has(opportunity.id)}
                  onChange={() => toggleOne(opportunity.id)}
                  aria-label={`Select ${opportunity.service_requested || "opportunity"}`}
                  className="rounded"
                />
              </div>
              <Link
                href={`/leads/${opportunity.id}/edit`}
                className="block min-w-0 flex-1"
              >
                <div className="grid gap-4 md:grid-cols-[1fr_135px_165px] md:items-start">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {opportunity.service_requested || "Untitled opportunity"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {customer?.name ||
                        opportunity.source ||
                        "No person or source saved"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Value</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatCurrency(opportunity.estimated_value)}
                    </p>
                    <p className="mt-3 text-xs font-medium text-slate-500">Source</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {opportunity.source || "Not set"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Next step</p>
                    <div className="mt-1">
                      <StatusBadge
                        tone={getFollowUpTone(opportunity.next_follow_up_date)}
                      >
                        {getFollowUpText(opportunity.next_follow_up_date)}
                      </StatusBadge>
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-500">Status</p>
                    <div className="mt-1">
                      <StatusBadge tone={getOpportunityTone(opportunity.status)}>
                        {opportunity.status || "Open"}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                {opportunity.notes && (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    {opportunity.notes}
                  </p>
                )}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
