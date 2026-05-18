"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { CRMPageData } from "../queries";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { STAGES, mapToStage, isOpenLead } from "../stages";

type Lead = CRMPageData["leads"][number];
type Props = CRMPageData & { profile?: IndustryProfile };

function isUrgent(lead: Lead): boolean {
  if (!lead.next_follow_up_date) return false;
  const due = new Date(lead.next_follow_up_date);
  return due < new Date();
}

function dateLabel(lead: Lead): string | null {
  if (lead.next_follow_up_date) {
    const d = new Date(lead.next_follow_up_date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  const d = new Date(lead.created_at);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CRMView({ leads, customers, profile }: Props) {
  const leadSingular = profile?.labels.leadSingular ?? "Opportunity";
  const leadPlural = profile?.labels.leadPlural ?? "Opportunities";
  const customerSingular = profile?.labels.customerSingular ?? "Client";
  const customerById = new Map(customers.map((c) => [c.id, { name: c.name }]));
  const openLeads = leads.filter((l) => isOpenLead(l.status));
  const totalPipelineValue = openLeads.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);

  const now = new Date();
  const wonThisMonth = leads.filter((l) => {
    const stage = mapToStage(l.status);
    if (stage !== "Won") return false;
    const d = new Date(l.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

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
    <div className="hidden md:block" style={{ padding: "28px 28px 40px" }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Pipeline</div>
          <div className="page-title">{leadPlural} pipeline</div>
          <div className="page-desc">
            {openLeads.length} active {leadPlural.toLowerCase()} · {formatCurrency(totalPipelineValue)} · {wonThisMonth} won this month
          </div>
        </div>
        <div className="page-actions">
          <div style={{ display: "flex", borderRadius: "10px", border: "1px solid var(--border)", overflow: "hidden", flexShrink: 0 }}>
            <Link href="/leads" className="btn btn-ghost" style={{ borderRadius: 0, borderRight: "1px solid var(--border)" }}>List</Link>
            <span className="btn btn-ghost" style={{ borderRadius: 0, background: "var(--surface-sunk)", fontWeight: 700, cursor: "default" }}>Board</span>
          </div>
          <Link href="/leads" className="btn btn-primary">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New {leadSingular.toLowerCase()}
          </Link>
        </div>
      </div>

      {/* Kanban */}
      <div className="kanban">
        {STAGES.filter((s) => s.name !== "Lost").map((stage) => {
          const stageLeads = leadsByStage.get(stage.name) ?? [];
          const totalValue = stageLeads.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
          return (
            <div key={stage.name} className="kanban-col">
              <div className="kanban-col-header">
                <div>
                  <span className="kanban-col-title">{stage.name}</span>
                  <span className="kanban-col-meta" style={{ fontSize: "10px", marginLeft: "5px" }}>{formatCurrency(totalValue)}</span>
                </div>
                <span className="kanban-count">{stageLeads.length}</span>
              </div>

              {stageLeads.map((lead) => {
                const customer = lead.customer_id ? customerById.get(lead.customer_id) : null;
                const urgent = isUrgent(lead);
                const dl = dateLabel(lead);
                return (
                  <Link key={lead.id} href={`/leads/${lead.id}/edit`} style={{ textDecoration: "none" }}>
                    <div className={`kanban-card ${urgent ? "urgent" : ""}`}>
                      <div className="kanban-card-name">{lead.service_requested || "Untitled"}</div>
                      <div className="kanban-card-client">{customer?.name || `No ${customerSingular.toLowerCase()}`}</div>
                      <div className="kanban-card-footer">
                        <span className="badge badge-neutral">{formatCurrency(lead.estimated_value)}</span>
                        <span style={{
                          fontSize: "11px",
                          color: urgent ? "var(--danger)" : "var(--faint)",
                          fontWeight: urgent ? 600 : 400,
                        }}>
                          {urgent ? `${Math.floor((Date.now() - new Date(lead.next_follow_up_date!).getTime()) / 86400000)}d overdue` : dl}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}

              <Link href="/leads" className="kanban-add" style={{ textDecoration: "none" }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add {stage.name.toLowerCase()}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
