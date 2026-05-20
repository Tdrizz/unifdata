"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { isTodayOrPast } from "@/lib/date-format";
import { getOpportunityTone } from "@/lib/status";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { LeadsTableClient } from "@/features/leads/components/LeadsTableClient";
import { LeadCreateForm } from "@/features/leads/components/LeadCreateForm";
import type { CRMPageData } from "../queries";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { STAGES, mapToStage, isOpenLead } from "../stages";

type Lead = CRMPageData["leads"][number];
type Props = CRMPageData & { profile?: IndustryProfile };

function isUrgent(lead: Lead): boolean {
  if (!lead.next_follow_up_date) return false;
  return new Date(lead.next_follow_up_date) < new Date();
}

function dateLabel(lead: Lead): string | null {
  if (lead.next_follow_up_date) {
    return new Date(lead.next_follow_up_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isWon(status: string | null) {
  const s = String(status || "").toLowerCase();
  return s.includes("won") || s.includes("accepted");
}

function isLost(status: string | null) {
  const s = String(status || "").toLowerCase();
  return s.includes("lost") || s.includes("cancel") || s.includes("declined");
}

export function CRMView({ leads, customers, profile }: Props) {
  const leadSingular = profile?.labels.leadSingular ?? "Opportunity";
  const leadPlural = profile?.labels.leadPlural ?? "Opportunities";
  const customerSingular = profile?.labels.customerSingular ?? "Client";
  const customerById = new Map(customers.map((c) => [c.id, { name: c.name }]));

  const openLeads = leads.filter((l) => isOpenLead(l.status));
  const wonLeads = leads.filter((l) => isWon(l.status));
  const lostLeads = leads.filter((l) => isLost(l.status));

  const openValue = openLeads.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
  const followUpNeeded = openLeads.filter((l) => !l.next_follow_up_date || isTodayOrPast(l.next_follow_up_date));

  const now = new Date();
  const wonThisMonth = wonLeads.filter((l) => {
    const d = new Date(l.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const missingPerson = openLeads.filter((l) => !l.customer_id);
  const missingSource = openLeads.filter((l) => !l.source);
  const missingEstimate = openLeads.filter((l) => l.estimated_value === null || l.estimated_value === undefined);
  const cleanupGroups = [
    { id: "missing-person", label: `Link ${customerSingular.toLowerCase()}`, title: `${leadPlural} missing ${customerSingular.toLowerCase()}`, count: missingPerson.length },
    { id: "missing-source", label: "Add source", title: `${leadPlural} missing source`, count: missingSource.length },
    { id: "missing-estimate", label: "Add value", title: `${leadPlural} missing value`, count: missingEstimate.length },
  ].filter((g) => g.count > 0);

  const recentlyClosed = [...wonLeads, ...lostLeads]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const prioritizedOpen = [...openLeads]
    .sort((a, b) => {
      const aNeedsFollowUp = !a.next_follow_up_date || isTodayOrPast(a.next_follow_up_date);
      const bNeedsFollowUp = !b.next_follow_up_date || isTodayOrPast(b.next_follow_up_date);
      if (aNeedsFollowUp !== bNeedsFollowUp) return aNeedsFollowUp ? -1 : 1;
      return Number(b.estimated_value || 0) - Number(a.estimated_value || 0);
    })
    .slice(0, 20);

  const leadsByStage = new Map<string, Lead[]>();
  for (const stage of STAGES) leadsByStage.set(stage.name, []);
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
          <div className="page-title">{leadPlural}</div>
          <div className="page-desc">
            {openLeads.length} active · {formatCurrency(openValue)} · {wonThisMonth} won this month
          </div>
        </div>
        <div className="page-actions">
          <a href="/api/export/csv?table=leads" download className="btn btn-ghost">Export CSV</a>
          <Link href="#leads-quick-add" className="btn btn-primary">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New {leadSingular.toLowerCase()}
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-row stat-row-4" style={{ marginBottom: "24px" }}>
        <StatCard label="Open value" value={formatCurrency(openValue)} helper={`${openLeads.length} active`} tone={openValue > 0 ? "positive" : "default"} />
        <StatCard label="Needs follow-up" value={followUpNeeded.length} helper="Missing, due, or overdue" tone={followUpNeeded.length > 0 ? "warning" : "positive"} />
        <StatCard label="Won this month" value={wonThisMonth} helper={`${wonLeads.length} won total`} tone={wonThisMonth > 0 ? "positive" : "default"} />
        <StatCard label="Data issues" value={cleanupGroups.reduce((s, g) => s + g.count, 0)} helper="Missing links, sources, or value" tone={cleanupGroups.length > 0 ? "warning" : "positive"} />
      </div>

      {/* Kanban */}
      <div className="kanban" style={{ marginBottom: "32px" }}>
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
                      <div className="kanban-card-name">{lead.service_requested || `Untitled ${leadSingular.toLowerCase()}`}</div>
                      <div className="kanban-card-client">{customer?.name || `No ${customerSingular.toLowerCase()}`}</div>
                      <div className="kanban-card-footer">
                        <span className="badge badge-neutral">{formatCurrency(lead.estimated_value)}</span>
                        <span style={{ fontSize: "11px", color: urgent ? "var(--danger)" : "var(--faint)", fontWeight: urgent ? 600 : 400 }}>
                          {urgent ? `${Math.floor((Date.now() - new Date(lead.next_follow_up_date!).getTime()) / 86400000)}d overdue` : dl}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}

              <Link href="#leads-quick-add" className="kanban-add" style={{ textDecoration: "none" }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add {stage.name.toLowerCase()}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Open leads table + health */}
      <div className="grid-2" style={{ marginBottom: "24px" }}>
        <SectionCard
          title={`Open ${leadPlural.toLowerCase()}`}
          description="Prioritized by follow-up need and value."
        >
          {prioritizedOpen.length === 0 ? (
            <EmptyState
              title={`No open ${leadPlural.toLowerCase()}`}
              description={`Add ${leadPlural.toLowerCase()} to start building the pipeline.`}
            />
          ) : (
            <LeadsTableClient
              leads={prioritizedOpen}
              customers={customers}
              profile={profile ?? { labels: { customerSingular, leadSingular } }}
              sectionTitle={`open ${leadPlural.toLowerCase()}`}
            />
          )}
        </SectionCard>

        <SectionCard
          title={`${leadSingular} health`}
          description="Data quality issues in the pipeline."
        >
          {cleanupGroups.length === 0 ? (
            <EmptyState
              title={`${leadPlural} look clean`}
              description={`No missing ${customerSingular.toLowerCase()} links, sources, or value.`}
            />
          ) : (
            <div>
              {cleanupGroups.map((item) => (
                <article key={item.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <StatusBadge tone="neutral">{item.label}</StatusBadge>
                    <p className="mt-2 font-semibold text-ud-ink">{item.title}</p>
                  </div>
                  <span className="inline-flex items-center rounded-[6px] border border-[rgba(23,22,20,0.08)] bg-ud-surface-sunk px-2 py-0.5 text-[11px] font-semibold text-ud-muted">
                    {item.count}
                  </span>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Recently closed */}
      <SectionCard
        title="Recently closed"
        description={`Won and lost ${leadPlural.toLowerCase()} out of the active pipeline.`}
      >
        {recentlyClosed.length === 0 ? (
          <EmptyState
            title={`No closed ${leadPlural.toLowerCase()} yet`}
            description={`Won or lost ${leadPlural.toLowerCase()} appear here once statuses are updated.`}
          />
        ) : (
          <div>
            {recentlyClosed.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}/edit`}
                className="grid gap-3 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 transition-colors hover:bg-ud-surface-soft md:grid-cols-[1fr_140px_120px] md:items-center"
              >
                <div>
                  <p className="font-semibold text-ud-ink">{lead.service_requested || `Untitled ${leadSingular.toLowerCase()}`}</p>
                  <p className="mt-1 text-sm text-ud-faint">{lead.source || "No source saved"}</p>
                </div>
                <p className="text-sm font-semibold text-ud-muted">{formatCurrency(lead.estimated_value)}</p>
                <StatusBadge tone={getOpportunityTone(lead.status)}>{lead.status || "Closed"}</StatusBadge>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Create form */}
      {profile && (
        <div id="leads-quick-add" style={{ marginTop: "24px" }}>
          <LeadCreateForm customers={customers} profile={profile} />
        </div>
      )}
    </div>
  );
}
