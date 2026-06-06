"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { formatCurrency } from "@/lib/utils";
import { formatDateOnly } from "@/lib/date-format";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { CRMPageData } from "../queries";
import { STAGES, mapToStage, isOpenLead } from "../stages";
import { LeadCreateForm } from "@/features/leads/components/LeadCreateForm";

type Lead = CRMPageData["leads"][number];

type Props = CRMPageData & { profile: IndustryProfile };

export function MobileCrmView({ leads, customers, profile }: Props) {
  const customerById = new Map(customers.map((c) => [c.id, { name: c.name }]));

  const openLeads = leads.filter((l) => isOpenLead(l.status));
  const totalPipelineValue = openLeads.reduce(
    (sum, l) => sum + Number(l.estimated_value || 0),
    0,
  );

  const leadsByStage = new Map<string, Lead[]>();
  for (const stage of STAGES) {
    leadsByStage.set(stage.name, []);
  }
  for (const lead of leads) {
    const stageName = mapToStage(lead.status);
    const existing = leadsByStage.get(stageName) ?? [];
    existing.push(lead);
    leadsByStage.set(stageName, existing);
  }

  const defaultStage =
    STAGES.find((s) => (leadsByStage.get(s.name) ?? []).length > 0)?.name ?? "Lead";

  const [activeStage, setActiveStage] = useState(defaultStage);

  const activeStageLeads = leadsByStage.get(activeStage) ?? [];
  const leadPlural = profile.labels.leadPlural;

  return (
    <div className="block md:hidden pb-8">
      {/* Header */}
      <div className="px-4 pt-[22px] pb-[18px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ud-muted">
          {leadPlural}
        </p>
        <p className="mt-[4px] text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-ud-ink">
          {formatCurrency(totalPipelineValue)}{" "}
          <span className="font-normal text-ud-muted">in {openLeads.length} open</span>
        </p>
      </div>

      {/* Stage chips */}
      <div className="overflow-x-auto no-scrollbar flex gap-2 px-4 pb-[14px]">
        {STAGES.filter((stage) => (leadsByStage.get(stage.name) ?? []).length > 0 || stage.name === activeStage).map((stage) => {
          const count = (leadsByStage.get(stage.name) ?? []).length;
          const isActive = activeStage === stage.name;
          return (
            <button
              key={stage.name}
              type="button"
              onClick={() => setActiveStage(stage.name)}
              className={[
                "flex-shrink-0 rounded-full px-[16px] py-[9px] text-[13px] font-semibold transition-colors",
                isActive
                  ? "bg-ud-ink text-white"
                  : "bg-ud-surface border border-ud text-ud-muted",
              ].join(" ")}
            >
              {stage.name} {count}
            </button>
          );
        })}
      </div>

      {/* Lead list */}
      {activeStageLeads.length === 0 ? (
        <div className="px-4">
          <EmptyState
            title={`No ${leadPlural.toLowerCase()} in this stage`}
            description="Move a record here when it's ready."
          />
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          {activeStageLeads.map((lead) => {
            const customer = lead.customer_id ? customerById.get(lead.customer_id) : undefined;
            return (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}/edit`}
                className="bg-ud-surface rounded-[10px] border border-ud p-4 block active:bg-ud-surface-sunk"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-[14px] text-ud-ink leading-snug">
                    {lead.service_requested || `Untitled ${profile.labels.leadSingular.toLowerCase()}`}
                  </p>
                  {lead.estimated_value != null && (
                    <p className="text-[13px] font-semibold text-ud-accent [font-variant-numeric:tabular-nums] shrink-0">
                      {formatCurrency(lead.estimated_value)}
                    </p>
                  )}
                </div>
                <div className="mt-[8px] flex flex-wrap items-center gap-[6px]">
                  <Pill tone="neutral">{lead.status || activeStage}</Pill>
                  {lead.next_follow_up_date && (
                    <span className="text-[11px] text-ud-muted">
                      Follow up {formatDateOnly(lead.next_follow_up_date)}
                    </span>
                  )}
                </div>
                <p className="mt-[8px] text-[12px] text-ud-muted">
                  {customer?.name || `No ${profile.labels.customerSingular.toLowerCase()} linked`}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {/* Quick add */}
      <div id="leads-quick-add" className="px-4 mt-6">
        <LeadCreateForm customers={customers} profile={profile} />
      </div>
    </div>
  );
}
