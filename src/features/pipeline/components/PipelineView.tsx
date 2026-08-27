"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PIPELINE_STAGES, STAGE_TO_QUICK_ADD_TYPE, getStageDisplayLabel, groupCardsByStage } from "../stages";
import { PipelineQuickAdd } from "./PipelineQuickAdd";
import { PipelineCardActions } from "./PipelineCardActions";
import { formatDateOnly } from "@/lib/date-format";
import type { PipelineCard as PipelineCardType, PipelinePageData } from "../types";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { LeadRow as JobsLeadRow } from "@/features/jobs/types";
import type { JobRow } from "@/features/sales/types";

type Props = PipelinePageData & {
  profile: IndustryProfile;
  jobPickerLeads: Pick<JobsLeadRow, "id" | "service_requested" | "status" | "estimated_value">[];
  leadPickerJobs: Pick<JobRow, "id" | "service_type">[];
};

const SOURCE_TYPE_LABEL: Record<PipelineCardType["sourceType"], string> = {
  lead: "Lead",
  job: "Job",
  sale: "Sale",
};

function PipelineCardRow({ card }: { card: PipelineCardType }) {
  return (
    <div className="bg-ud-surface border border-ud rounded-[13px] p-[14px_15px] mb-2 shadow-ud transition-[box-shadow,transform] duration-[220ms] hover:-translate-y-0.5 hover:shadow-ud-raised">
      <Link href={card.editHref} className="block cursor-pointer" style={{ textDecoration: "none" }}>
        <div className="flex items-center justify-between gap-2 mb-[3px]">
          <p className="text-[13px] font-semibold text-ud-ink leading-[1.3] truncate">{card.title}</p>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] text-ud-faint">
            {SOURCE_TYPE_LABEL[card.sourceType]}
          </span>
        </div>
        <p className="text-[12px] text-ud-muted mb-2.5">{card.contactName || "No contact linked"}</p>
        <div className="flex items-center justify-between">
          <StatusBadge tone="neutral">{formatCurrency(card.value)}</StatusBadge>
          <span className="text-ud-faint text-[11px]">{card.statusLabel}</span>
        </div>
        {card.openFollowUp && (
          <p className="mt-2 text-[11px] font-semibold text-ud-danger">
            Follow-up due {formatDateOnly(card.openFollowUp.dueDate)}
          </p>
        )}
      </Link>
      <PipelineCardActions card={card} />
    </div>
  );
}

export function PipelineView({ cards, profile, jobPickerLeads, leadPickerJobs }: Props) {
  const grouped = groupCardsByStage(cards);

  const activeCards = cards.filter((c) => c.stage !== "Lost");
  const pipelineValue = activeCards.reduce((sum, c) => sum + (c.value ?? 0), 0);
  const activeWorkCount = (grouped.get("Active")?.length ?? 0) + (grouped.get("Complete")?.length ?? 0);
  // Every sale card lands in the "Paid" stage regardless of its own payment
  // status (see mapRecordsToCards), so filter sale cards down to ones whose
  // payment_status is actually "Paid" before treating them as real revenue.
  // Job cards only reach "Paid" via isCompletedPaidJob, which already means paid.
  const paidCards = (grouped.get("Paid") ?? []).filter((c) => c.sourceType !== "sale" || c.statusLabel === "Paid");
  const paidValue = paidCards.reduce((sum, c) => sum + (c.value ?? 0), 0);

  return (
    <div className="hidden md:block px-8 pt-7 pb-12">
      <PageHeader
        eyebrow={profile.pipelineLabel}
        title={profile.pipelineLabel}
        description={`${activeCards.length} active · ${formatCurrency(pipelineValue)} · ${paidCards.length} paid`}
        className="mb-6"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Pipeline value" value={formatCurrency(pipelineValue)} helper={`${activeCards.length} active records`} tone={pipelineValue > 0 ? "positive" : "default"} />
        <StatCard label="Active work" value={activeWorkCount} helper="Being worked or awaiting payment" tone={activeWorkCount > 0 ? "warning" : "default"} />
        <StatCard label="Paid" value={formatCurrency(paidValue)} helper={`${paidCards.length} records`} tone={paidValue > 0 ? "positive" : "default"} />
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-5 gap-3.5 items-start mb-8">
        {PIPELINE_STAGES.map((stage) => {
          const stageCards = grouped.get(stage.name) ?? [];
          const totalValue = stageCards.reduce((sum, c) => sum + (c.value ?? 0), 0);
          const quickAddType = STAGE_TO_QUICK_ADD_TYPE[stage.name];
          const displayLabel = getStageDisplayLabel(stage.name, profile);
          return (
            <div key={stage.name} className="bg-ud-surface-sunk rounded-[12px] p-3 min-h-[200px] border border-ud-soft">
              <div className="flex items-center justify-between mb-3 gap-2">
                <div>
                  <span className="text-[11px] font-bold text-ud-muted uppercase tracking-[0.10em]">{displayLabel}</span>
                  <span className="text-[11px] text-ud-faint ml-[5px]">{formatCurrency(totalValue)}</span>
                </div>
                <span className="text-[10px] font-bold bg-ud-surface-sunk text-ud-faint rounded-full px-2 py-[2px]">{stageCards.length}</span>
              </div>

              {stageCards.map((card) => (
                <PipelineCardRow key={card.id} card={card} />
              ))}

              <Link
                href={`?type=${quickAddType}&add=${encodeURIComponent(stage.name)}#pipeline-quick-add`}
                className="flex items-center gap-1.5 p-2 rounded-[8px] text-[12px] text-ud-faint cursor-pointer w-full border border-dashed border-transparent hover:bg-[rgba(0,0,0,0.04)] hover:border-[rgba(0,0,0,0.10)] hover:text-ud-muted transition-[background-color,border-color,color] duration-[120ms]"
                style={{ textDecoration: "none" }}
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add {displayLabel.toLowerCase()}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Revenue */}
      <SectionCard
        title="Revenue"
        description="Total revenue actually collected — sales and jobs marked paid."
      >
        <div className="px-5 py-6 border-b border-[rgba(23,22,20,0.04)]">
          <p className="text-[32px] font-bold tracking-[-0.02em] leading-none text-ud-ink udv2-num">{formatCurrency(paidValue)}</p>
          <p className="mt-2 text-[13px] text-ud-muted">{paidCards.length} paid record{paidCards.length === 1 ? "" : "s"}</p>
        </div>
        {paidCards.length === 0 ? (
          <EmptyState
            title="No revenue collected yet"
            description="Paid sales and completed, paid-in-full jobs appear here."
          />
        ) : (
          <div>
            {paidCards.slice(0, 8).map((card) => (
              <Link
                key={card.id}
                href={card.editHref}
                className="grid gap-3 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 transition-colors hover:bg-ud-surface-soft md:grid-cols-[1fr_140px_120px] md:items-center"
              >
                <div>
                  <p className="font-semibold text-ud-ink">{card.title}</p>
                  <p className="mt-1 text-sm text-ud-faint">{card.contactName || "No contact linked"}</p>
                </div>
                <p className="text-sm font-semibold text-ud-muted">{formatCurrency(card.value)}</p>
                <StatusBadge tone="success">{card.statusLabel}</StatusBadge>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Quick add */}
      <div id="pipeline-quick-add" style={{ marginTop: "24px" }}>
        <PipelineQuickAdd profile={profile} leads={jobPickerLeads} jobs={leadPickerJobs} />
      </div>
    </div>
  );
}
