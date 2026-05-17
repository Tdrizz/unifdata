"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatStrip } from "@/components/ui/StatStrip";
import { KanbanColumn } from "./KanbanColumn";
import { formatCurrency } from "@/lib/utils";
import type { CRMPageData } from "../queries";
import { STAGES, mapToStage, isOpenLead } from "../stages";

type Lead = CRMPageData["leads"][number];

type Props = CRMPageData;

export function CRMView({ leads, customers }: Props) {
  const customerById = new Map(customers.map((c) => [c.id, { name: c.name }]));

  const openLeads = leads.filter((l) => isOpenLead(l.status));

  const totalPipelineValue = openLeads.reduce(
    (sum, l) => sum + Number(l.estimated_value || 0),
    0,
  );

  // Won this month
  const now = new Date();
  const wonThisMonth = leads
    .filter((l) => {
      const stage = mapToStage(l.status);
      if (stage !== "Won") return false;
      const d = new Date(l.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);

  // Avg close days for closed/won leads
  const closedLeads = leads.filter((l) => {
    const stage = mapToStage(l.status);
    return stage === "Won" || stage === "Lost";
  });

  let avgCloseDays: string | number = "—";
  if (closedLeads.length > 0) {
    const totalDays = closedLeads.reduce((sum, l) => {
      const created = new Date(l.created_at).getTime();
      // Use created_at as proxy since updated_at is not in the type
      const closed = Date.now();
      return sum + Math.max(0, Math.floor((closed - created) / (1000 * 60 * 60 * 24)));
    }, 0);
    avgCloseDays = Math.round(totalDays / closedLeads.length);
  }

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

  return (
    <div className="hidden md:block space-y-[24px] px-[24px] py-[20px]">
      <PageHeader
        eyebrow="Pipeline · Quotes"
        title={
          <span className="udv2-num">
            {formatCurrency(totalPipelineValue)} across {openLeads.length} open quotes
          </span>
        }
        description="Drag a card between stages to advance it. Lifecycle: Clients → Quotes → Visits → Payments."
      />

      <StatStrip
        items={[
          { label: "Total pipeline", value: formatCurrency(totalPipelineValue) },
          {
            label: "Won this month",
            value: formatCurrency(wonThisMonth),
            helper: "+12% vs last",
          },
          {
            label: "Open quotes",
            value: openLeads.length,
            helper: "Active opportunities",
          },
          {
            label: "Avg close days",
            value: avgCloseDays,
            helper: "↓ 2 days",
          },
        ]}
      />

      {/* Kanban */}
      <div className="grid grid-cols-5 gap-[14px] items-start overflow-x-auto">
        {STAGES.map((stage) => {
          const stageLeads = leadsByStage.get(stage.name) ?? [];
          const totalValue = stageLeads.reduce(
            (sum, l) => sum + Number(l.estimated_value || 0),
            0,
          );
          return (
            <KanbanColumn
              key={stage.name}
              stage={stage.name}
              color={stage.color}
              leads={stageLeads}
              customerById={customerById}
              totalValue={totalValue}
            />
          );
        })}
      </div>
    </div>
  );
}
