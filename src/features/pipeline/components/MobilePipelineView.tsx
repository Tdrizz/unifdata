"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionCard } from "@/components/ui/SectionCard";
import { Pill } from "@/components/ui/Pill";
import { formatCurrency } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PIPELINE_STAGES, STAGE_TO_QUICK_ADD_TYPE, getStageDisplayLabel, groupCardsByStage } from "../stages";
import { PIPELINE_ISSUE_FILTERS, PIPELINE_ISSUE_LABELS, isPipelineIssueId } from "../issue-filters";
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

// Pulled out of the stage-chip card list so the issue-filtered view (below)
// can render the exact same card without duplicating this JSX.
function MobilePipelineCardRow({ card }: { card: PipelineCard }) {
  return (
    <div className="bg-ud-surface rounded-[10px] border border-ud p-4 active:bg-ud-surface-sunk">
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
  );
}

export function MobilePipelineView({ cards, profile, jobPickerLeads, leadPickerJobs }: Props) {
  // See PipelineView's matching block — same /crm?issue=<id> deep link from
  // Data Hub, same flat-list-instead-of-board treatment on mobile.
  const searchParams = useSearchParams();
  const issueParam = searchParams.get("issue");
  const activeIssue = isPipelineIssueId(issueParam) ? issueParam : null;
  const issueCards = activeIssue ? cards.filter(PIPELINE_ISSUE_FILTERS[activeIssue]) : null;

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

  const activeStageCards = grouped.get(activeStage) ?? [];

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

      {activeIssue && (
        <div className="mx-4 mb-[14px] flex items-center justify-between gap-2 px-3 py-2.5 bg-ud-warning-bg border border-ud-warning/20 rounded-[9px]">
          <p className="text-[12px] text-ud-ink">
            {issueCards!.length} record{issueCards!.length === 1 ? "" : "s"} {PIPELINE_ISSUE_LABELS[activeIssue]}
          </p>
          <Link href="/crm" className="text-[12px] font-semibold text-ud-accent shrink-0">
            Clear
          </Link>
        </div>
      )}

      {issueCards ? (
        <div className="px-4 flex flex-col gap-3">
          {issueCards.length === 0 ? (
            <EmptyState title="Nothing here anymore" description="These records have already been fixed or removed." />
          ) : (
            issueCards.map((card) => <MobilePipelineCardRow key={card.id} card={card} />)
          )}
        </div>
      ) : (
        <>
      {/* Stage chips — all 5, same as desktop's always-visible kanban columns */}
      <div className="overflow-x-auto no-scrollbar flex gap-2 px-4 pb-[14px]">
        {PIPELINE_STAGES.map((stage) => {
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
              {getStageDisplayLabel(stage.name, profile)} {count}
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
            <MobilePipelineCardRow key={card.id} card={card} />
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
        </>
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
