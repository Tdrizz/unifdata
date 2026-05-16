"use client";

import { useState } from "react";
import Link from "next/link";
import { Display } from "@/components/ui/Display";
import { FilterChip } from "@/components/ui/FilterChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { LeadCard } from "./LeadCard";
import { formatCurrency } from "@/lib/utils";
import type { CRMPageData } from "../queries";

type Lead = CRMPageData["leads"][number];

const STAGES: { name: string; keys: string[] }[] = [
  { name: "New", keys: ["new", "lead", "contact"] },
  { name: "Qualified", keys: ["qualified", "interested"] },
  { name: "Quoted", keys: ["quoted", "proposal"] },
  { name: "Accepted", keys: ["accepted", "won", "confirmed"] },
  { name: "Lost", keys: ["lost", "declined", "closed"] },
];

function mapToStage(status: string | null): string {
  const s = (status || "").toLowerCase().trim();
  for (const stage of STAGES) {
    if (stage.keys.some((k) => s.includes(k))) return stage.name;
  }
  return "New";
}

function isOpenLead(status: string | null): boolean {
  const s = (status || "").toLowerCase().trim();
  const closedKeys = ["lost", "closed", "won", "declined", "rejected"];
  return !closedKeys.some((k) => s.includes(k));
}

type Props = CRMPageData;

export function MobileCrmView({ leads, customers }: Props) {
  const customerById = new Map(customers.map((c) => [c.id, { name: c.name }]));

  const openLeads = leads.filter((l) => isOpenLead(l.status));
  const totalPipelineValue = openLeads.reduce(
    (sum, l) => sum + Number(l.estimated_value || 0),
    0,
  );

  // Group leads by stage
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

  // Default to first stage that has leads, or "New"
  const defaultStage =
    STAGES.find((s) => (leadsByStage.get(s.name) ?? []).length > 0)?.name ?? "New";

  const [activeStage, setActiveStage] = useState(defaultStage);

  const activeStageLeads = leadsByStage.get(activeStage) ?? [];

  return (
    <div className="block md:hidden">
      {/* Title block */}
      <div className="px-[18px] pt-[4px] pb-[14px]">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ud-muted mb-1">
          Quotes pipeline
        </p>
        <Display size={28}>
          <span className="udv2-num">{formatCurrency(totalPipelineValue)}</span>
          {" "}in {openLeads.length} open quotes
        </Display>
      </div>

      {/* Stage chips */}
      <div className="px-[18px] pb-[14px] flex gap-[6px] overflow-x-auto no-scrollbar">
        {STAGES.map((stage) => {
          const count = (leadsByStage.get(stage.name) ?? []).length;
          return (
            <FilterChip
              key={stage.name}
              active={activeStage === stage.name}
              onClick={() => setActiveStage(stage.name)}
            >
              {stage.name} {count}
            </FilterChip>
          );
        })}
      </div>

      {/* Lead list */}
      <div className="px-[14px] flex flex-col gap-[10px]">
        {activeStageLeads.length === 0 ? (
          <EmptyState
            title="No quotes in this stage"
            description="Move an opportunity here when it's ready."
          />
        ) : (
          activeStageLeads.map((lead) => {
            const customer = lead.customer_id ? customerById.get(lead.customer_id) : undefined;
            return (
              <Link key={lead.id} href={`/leads/${lead.id}/edit`}>
                <LeadCard
                  lead={lead}
                  customerName={customer?.name}
                  href={`/leads/${lead.id}/edit`}
                  compact={false}
                />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
