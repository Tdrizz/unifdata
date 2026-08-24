"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { formatCurrency } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PIPELINE_STAGES, groupCardsByStage } from "../stages";
import { PipelineQuickAdd } from "./PipelineQuickAdd";
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
  const activeCards = cards.filter((c) => c.stage !== "Lost");
  const pipelineValue = activeCards.reduce((sum, c) => sum + (c.value ?? 0), 0);

  const defaultStage = PIPELINE_STAGES.find((s) => (grouped.get(s.name) ?? []).length > 0)?.name ?? "Lead";
  const [activeStage, setActiveStage] = useState(defaultStage);
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeStageCards = grouped.get(activeStage) ?? [];

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

      {/* Stage chips */}
      <div className="overflow-x-auto no-scrollbar flex gap-2 px-4 pb-[14px]">
        {PIPELINE_STAGES.filter((stage) => (grouped.get(stage.name) ?? []).length > 0 || stage.name === activeStage).map((stage) => {
          const count = (grouped.get(stage.name) ?? []).length;
          const isActive = activeStage === stage.name;
          return (
            <button
              key={stage.name}
              type="button"
              onClick={() => setActiveStage(stage.name)}
              className={[
                "flex-shrink-0 rounded-full px-[16px] py-[9px] text-[13px] font-semibold transition-colors",
                isActive ? "bg-ud-ink text-white" : "bg-ud-surface border border-ud text-ud-muted",
              ].join(" ")}
            >
              {stage.name} {count}
            </button>
          );
        })}
      </div>

      {/* Card list */}
      {activeStageCards.length === 0 ? (
        <div className="px-4">
          <EmptyState title="Nothing in this stage" description="Move a record here when it's ready." />
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          {activeStageCards.map((card) => (
            <Link
              key={card.id}
              href={card.editHref}
              className="bg-ud-surface rounded-[10px] border border-ud p-4 block active:bg-ud-surface-sunk"
            >
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
            </Link>
          ))}
        </div>
      )}

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
        <PipelineQuickAdd profile={profile} leads={jobPickerLeads} jobs={leadPickerJobs} />
      </BottomSheet>
    </div>
  );
}
