"use client";

import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { formatCurrency } from "@/lib/utils";

export type LeadCardLead = {
  id: string;
  service_requested: string | null;
  status: string | null;
  estimated_value: number | null;
  created_at: string;
  customer_id: string | null;
};

type Props = {
  lead: LeadCardLead;
  customerName?: string;
  href: string;
  compact?: boolean;
};

function getPriority(value: number | null): { label: string; dot: ReactNode } {
  const v = Number(value || 0);
  if (v > 10000) {
    return {
      label: "HIGH",
      dot: <span className="w-[5px] h-[5px] rounded-full bg-red-500 inline-block" />,
    };
  }
  if (v > 3000) {
    return {
      label: "MED",
      dot: <span className="w-[5px] h-[5px] rounded-full bg-amber-500 inline-block" />,
    };
  }
  return {
    label: "LOW",
    dot: <span className="w-[5px] h-[5px] rounded-full bg-ud-faint inline-block" />,
  };
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo ago`;
  return `${Math.floor(diffMo / 12)}y ago`;
}

export function LeadCard({ lead, customerName, compact = true }: Props) {
  const priority = getPriority(lead.estimated_value);
  const relTime = getRelativeTime(lead.created_at);
  const title = lead.service_requested || "Untitled";
  const value = Number(lead.estimated_value || 0);

  if (!compact) {
    // Mobile full-width card
    return (
      <div className="bg-ud-surface border border-ud rounded-[12px] p-[14px_16px] shadow-ud">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2 mb-[8px]">
          <div className="flex items-center gap-[6px]">
            {priority.dot}
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ud-muted">
              {priority.label}
            </span>
          </div>
          <span className="udv2-num text-[12px] font-semibold text-ud-accent">
            {value > 0 ? formatCurrency(lead.estimated_value) : "—"}
          </span>
        </div>
        {/* Title */}
        <p className="text-[14px] font-semibold text-ud-ink leading-[1.3] mb-[8px]">{title}</p>
        {/* Bottom row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-[6px] min-w-0">
            {customerName && (
              <>
                <Avatar name={customerName} size={18} square={false} />
                <span className="text-[11.5px] text-ud-muted truncate">{customerName}</span>
              </>
            )}
          </div>
          <span className="udv2-num text-[10.5px] text-ud-faint shrink-0">{relTime}</span>
        </div>
      </div>
    );
  }

  // Desktop compact kanban card
  return (
    <div className="bg-ud-surface border border-ud rounded-[10px] p-[10px_12px] shadow-ud cursor-grab hover:-translate-y-px hover:shadow-ud-raised transition-[box-shadow,transform] duration-[120ms] ease-out">
      {/* Top row */}
      <div className="flex items-center justify-between gap-2 mb-[6px]">
        <div className="flex items-center gap-[5px]">
          {priority.dot}
          <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ud-muted">
            {priority.label}
          </span>
        </div>
        <span className="udv2-num text-[11.5px] font-semibold text-ud-accent">
          {value > 0 ? formatCurrency(lead.estimated_value) : "—"}
        </span>
      </div>
      {/* Title */}
      <p className="text-[13px] font-semibold text-ud-ink leading-[1.3] mb-[7px]">{title}</p>
      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-[5px] min-w-0">
          {customerName ? (
            <>
              <Avatar name={customerName} size={18} square={false} />
              <span className="text-[11.5px] text-ud-muted truncate">{customerName}</span>
            </>
          ) : (
            <span className="text-[11.5px] text-ud-faint">No contact</span>
          )}
        </div>
        <span className="udv2-num text-[10.5px] text-ud-faint shrink-0">{relTime}</span>
      </div>
    </div>
  );
}
