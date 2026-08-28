"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionCard } from "@/components/ui/SectionCard";
import { Pill } from "@/components/ui/Pill";
import { formatCurrency } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PIPELINE_STAGES, STAGE_TO_QUICK_ADD_TYPE, getStageDisplayLabel, groupCardsByStage } from "../stages";
import { PipelineQuickAdd } from "./PipelineQuickAdd";
import { PipelineCardActions } from "./PipelineCardActions";
import { formatDateOnly } from "@/lib/date-format";
import type { PipelineCard, PipelinePageData } from "../types";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { LeadRow as JobsLeadRow } from "@/features/jobs/types";
import type { JobRow } from "@/features/sales/types";

type Props = PipelinePageData & {
  profile: IndustryProfile;
  jobPickerLeads: Pick<JobsLeadRow, "id" | "service_requested" | "status" | "estimated_value">[];
  leadPickerJobs: Pick<JobRow, "id" | "service_type">[];
};

const SOURCE_TYPE_LABEL: Record<PipelineCard["sourceType"], string> = {
  lead: "Lead",
  job: "Job",
  sale: "Sale",
};

export function MobilePipelineView({ cards, profile, jobPickerLeads, leadPickerJobs }: Props) {
  const grouped = groupCardsByStage(cards);
  // Every sale card lands in the "Paid" stage regardless of its own payment
  // status (see mapRecordsToCards), so filter sale cards down to ones whose
  // payment_status is actually "Paid" before treating them as real revenue.
  const paidCards = (grouped.get("Paid") ?? []).filter((c) => c.sourceType !== "sale" || c.statusLabel === "Paid");
  const paidValue = paidCards.reduce((sum, c) => sum + (c.value ?? 0), 0);
  const activeCards = cards.filter((c) => c.stage !== "Lost");
  const pipelineValue = activeCards.reduce((sum, c) => sum + (c.value ?? 0), 0);

  const defaultStage = PIPELINE_STAGES.find((s) => (grouped.get(s.name) ?? []).length > 0)?.name ?? "Lead";
  const [activeStage, setActiveStage] = useState(defaultStage);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Second-level quick filter within the active stage tab — stage chips
  // already narrow to one column, and this narrows further to just the cards
  // that actually need a follow-up today, matching the desktop board's chip.
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const stageCards = grouped.get(activeStage) ?? [];
  const stageFollowUpCount = stageCards.filter((c) => c.openFollowUp).length;
  const activeStageCards = followUpOnly ? stageCards.filter((c) => c.openFollowUp) : stageCards;

  // Same targeting desktop's per-column "Add" links use: opening the sheet
  // from a given stage defaults the quick-add tab to whatever record type
  // actually lands in that stage, not always "lead". Passed directly as
  // props rather than through the URL — the sheet's contents mount fresh
  // every time it opens, so there's no navigation round-trip to race.
  const quickAddType = STAGE_TO_QUICK_ADD_TYPE[activeStage] ?? "lead";

  return (
    <div className="block md:hidden pb-8">
      {/* Header */}
      <div className="px-4 pt-[22px] pb-[18px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ud-muted">
          {profile.pipelineLabel}
        </p>
        <p className="mt-[4px] text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-ud-ink">
          {formatCurrency(pipelineValue)}{" "}
          <span className="font-normal text-ud-muted">in {activeCards.length} active</span>
        </p>
      </div>

      {/* Stage chips — all 5, same as desktop's always-visible kanban columns */}
      <div className="overflow-x-auto no-scrollbar flex gap-2 px-4 pb-[14px]">
        {PIPELINE_STAGES.map((stage) => {
          const count = (grouped.get(stage.name) ?? []).length;
          const isActive = activeStage === stage.name;
          return (
            <button
              key={stage.name}
              type="button"
              onClick={() => {
                setActiveStage(stage.name);
                setFollowUpOnly(false);
              }}
              className={[
                "flex-shrink-0 rounded-full px-[16px] py-[9px] text-[13px] font-semibold transition-colors",
                isActive ? "bg-ud-ink text-white" : "bg-ud-surface border border-ud text-ud-muted",
              ].join(" ")}
            >
              {getStageDisplayLabel(stage.name, profile)} {count}
            </button>
          );
        })}
      </div>

      {/* Quiet secondary filter — narrows the active stage tab further to
          just what needs a call/email today, without competing visually
          with the bolder stage tabs above it. */}
      {stageFollowUpCount > 0 && (
        <div className="px-4 pb-[14px]">
          <button
            type="button"
            onClick={() => setFollowUpOnly((v) => !v)}
            className={[
              "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
              followUpOnly ? "bg-ud-danger/15 text-ud-danger border border-ud-danger/30" : "bg-ud-surface border border-ud text-ud-muted",
            ].join(" ")}
          >
            Has open follow-up <span className="tabular-nums opacity-70">{stageFollowUpCount}</span>
          </button>
        </div>
      )}

      {/* Card list */}
      {activeStageCards.length === 0 ? (
        <div className="px-4">
          <EmptyState title="Nothing in this stage" description="Move a record here when it's ready." />
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          {activeStageCards.map((card) => (
            <div key={card.id} className="bg-ud-surface rounded-[10px] border border-ud p-4 active:bg-ud-surface-sunk">
              <Link href={card.editHref} className="block">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-[14px] text-ud-ink leading-snug">{card.title}</p>
                  {card.value != null && (
                    <p className="text-[13px] font-semibold text-ud-accent [font-variant-numeric:tabular-nums] shrink-0">
                      {formatCurrency(card.value)}
                    </p>
                  )}
                </div>
                <div className="mt-[8px] flex flex-wrap items-center gap-[6px]">
                  <Pill tone="neutral">{SOURCE_TYPE_LABEL[card.sourceType]}</Pill>
                  <span className="text-[11px] text-ud-muted">{card.statusLabel}</span>
                </div>
                <p className="mt-[8px]">
                  {card.contactName ? (
                    <span className="text-[12px] text-ud-muted">{card.contactName}</span>
                  ) : (
                    <span className="text-[12px] text-ud-faint italic">No contact linked</span>
                  )}
                </p>
                {card.openFollowUp && (
                  <p className="mt-2 text-[11px] font-semibold text-ud-danger">
                    Follow-up due {formatDateOnly(card.openFollowUp.dueDate)}
                  </p>
                )}
              </Link>
              <PipelineCardActions card={card} />
            </div>
          ))}
        </div>
      )}

      {/* Revenue — same section desktop shows below the kanban, now showing actual paid revenue */}
      <div className="px-4 pt-6">
        <SectionCard
          title="Revenue"
          description="Total revenue actually collected — sales and jobs marked paid."
        >
          <div className="px-4 py-5 border-b border-[rgba(23,22,20,0.04)]">
            <p className="text-[26px] font-bold tracking-[-0.02em] leading-none text-ud-ink [font-variant-numeric:tabular-nums]">{formatCurrency(paidValue)}</p>
            <p className="mt-2 text-[12px] text-ud-muted">{paidCards.length} paid record{paidCards.length === 1 ? "" : "s"}</p>
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
                  className="flex items-center gap-3 px-4 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 active:bg-ud-surface-soft"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] text-ud-ink truncate">{card.title}</p>
                    <p className="mt-0.5 text-[12px] text-ud-faint truncate">{card.contactName || "No contact linked"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold text-ud-muted [font-variant-numeric:tabular-nums]">{formatCurrency(card.value)}</p>
                    <StatusBadge tone="success">{card.statusLabel}</StatusBadge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-[calc(var(--mobile-tabbar-h)+env(safe-area-inset-bottom)+12px)] right-4 z-30 w-12 h-12 rounded-full bg-ud-accent text-white shadow-ud-pop flex items-center justify-center active:scale-95 transition-transform md:hidden"
        aria-label={"Add to " + profile.pipelineLabel}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={"Add to " + profile.pipelineLabel}>
        <PipelineQuickAdd
          profile={profile}
          leads={jobPickerLeads}
          jobs={leadPickerJobs}
          initialType={quickAddType}
          initialStage={activeStage}
        />
      </BottomSheet>
    </div>
  );
}
