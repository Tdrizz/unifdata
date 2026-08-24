"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Pill } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { VeraDraftCard, VeraAlertCard } from "@/components/vera/VeraCards";
import { isOverdue, isDueToday } from "@/lib/date-format";
import { formatCurrency, cn } from "@/lib/utils";
import { isOpenFollowUp, getWorkTone } from "@/lib/status";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { WorkspaceData } from "../queries";
import { getAlertHref, getDraftHref } from "@/lib/agents/alert-routing";
import { getDayLabel, getGreeting, getSortDate, getFollowUpLabel, getFollowUpTone, computeWorkspaceStats } from "../compute";

type QueueItem = {
  id: string;
  label: string;
  title: string;
  detail: string;
  href: string;
  tone: "success" | "warning" | "danger" | "neutral";
  due_date?: string | null;
  priority: number;
};

type Draft = { id: string; draft_type: string; subject?: string | null; body: string; action_label?: string | null; record_id?: string | null };
type Alert = { id: string; alert_type: string; severity: "info" | "warning" | "critical"; title: string; body: string; record_id?: string | null };
type Props = WorkspaceData & {
  profile: IndustryProfile;
  companyName: string;
  drafts?: Draft[];
  alerts?: Alert[];
};

type ChatMessage = { role: "user" | "model"; text: string; streaming?: boolean };

// Same dashboard as desktop's WorkspaceView — same KPIs, same actionable
// Vera panel, same priority queue, same jobs/pipeline sections — just
// stacked single-column instead of a side-by-side grid.
export function MobileWorkspaceView({ customers, leads, jobs, sales, followUps, profile, companyName, drafts = [], alerts = [] }: Props) {
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const [draftList, setDraftList] = useState<Draft[]>(drafts);
  const [alertList, setAlertList] = useState<Alert[]>(alerts);
  const [showAllVera, setShowAllVera] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);

  async function sendChatMessage(text: string) {
    if (!text.trim() || chatLoading) return;
    const userMessage: ChatMessage = { role: "user", text: text.trim() };
    setChatMessages((prev) => [...prev, userMessage, { role: "model", text: "", streaming: true }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [userMessage], sessionId: chatSessionId }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        setChatMessages((prev) => [...prev.slice(0, -1), { role: "model", text: data.error || "Something went wrong." }]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.delta) {
              setChatMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.streaming) updated[updated.length - 1] = { ...last, text: last.text + parsed.delta };
                return updated;
              });
            }
            if (parsed.event === "session" && parsed.sessionId) setChatSessionId(parsed.sessionId);
          } catch {
            // ignore malformed chunks
          }
        }
      }

      setChatMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) updated[updated.length - 1] = { ...last, streaming: false };
        return updated;
      });
    } catch {
      setChatMessages((prev) => [...prev.slice(0, -1), { role: "model", text: "Could not reach the server." }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleApproveDraft(id: string) {
    const res = await fetch(`/api/v1/agent-drafts/${id}/approve`, { method: "POST" });
    if (res.ok) setDraftList((prev) => prev.filter((d) => d.id !== id));
  }
  async function handleDismissDraft(id: string) {
    const res = await fetch(`/api/v1/agent-drafts/${id}/dismiss`, { method: "POST" });
    if (res.ok) setDraftList((prev) => prev.filter((d) => d.id !== id));
  }
  async function handleDismissAlert(id: string) {
    const res = await fetch(`/api/v1/agent-alerts/${id}/dismiss`, { method: "POST" });
    if (res.ok) setAlertList((prev) => prev.filter((a) => a.id !== id));
  }

  const { openLeads, activeWork, unpaidRevenue, openPipelineValue, unpaidRevenueValue, revenueMTD } =
    computeWorkspaceStats({ leads, jobs, sales });

  const manualFollowUpItems: QueueItem[] = followUps
    .filter((action) => isOpenFollowUp(action.status))
    .map((action) => ({
      id: `manual-follow-up-${action.id}`,
      label: "Follow-up",
      title: action.message || "Follow up",
      detail: getFollowUpLabel(action.due_date),
      href: `/follow-ups/${action.id}/edit`,
      tone: getFollowUpTone(action.due_date),
      due_date: action.due_date,
      priority: isOverdue(action.due_date) ? 0 : isDueToday(action.due_date) ? 1 : action.due_date ? 2 : 4,
    }));

  const opportunityFollowUpItems: QueueItem[] = openLeads
    .filter((lead) => Boolean(lead.next_follow_up_date))
    .map((lead) => ({
      id: `opportunity-follow-up-${lead.id}`,
      label: profile.labels.leadSingular,
      title: lead.service_requested || `Follow up on ${profile.labels.leadSingular.toLowerCase()}`,
      detail: getFollowUpLabel(lead.next_follow_up_date),
      href: `/leads/${lead.id}/edit`,
      tone: getFollowUpTone(lead.next_follow_up_date),
      due_date: lead.next_follow_up_date,
      priority: isOverdue(lead.next_follow_up_date) ? 0 : isDueToday(lead.next_follow_up_date) ? 1 : lead.next_follow_up_date ? 2 : 4,
    }));

  const paymentAttentionItems: QueueItem[] = unpaidRevenue.map((record) => ({
    id: `payment-${record.id}`,
    label: "Unpaid",
    title: record.service_type || formatCurrency(record.amount),
    detail: `${formatCurrency(record.amount)} — ${record.payment_status || "unpaid"}`,
    href: `/sales/${record.id}/edit`,
    tone: "danger" as const,
    priority: 1,
  }));

  // Vera's own suggestions (drafts/alerts) get their own actionable panel
  // below, with real approve/dismiss buttons — same as desktop. A data
  // cleanup summary stands in for them here, matching desktop's queue.
  const dataIssueCount =
    customers.filter((c) => !c.phone || !c.email).length +
    customers.filter((c) => !c.address).length +
    openLeads.filter((l) => !l.contact_id && !l.customer_id).length +
    openLeads.filter((l) => !l.source).length +
    openLeads.filter((l) => l.estimated_value === null || l.estimated_value === undefined).length +
    jobs.filter((w) => w.job_value === null || w.job_value === undefined).length;

  const cleanupItems: QueueItem[] =
    dataIssueCount > 0
      ? [{
          id: "data-cleanup-summary",
          label: "Data cleanup",
          title: `${dataIssueCount} data issues to fix`,
          detail: "Missing contact info, values, or links.",
          href: "/data-hub",
          tone: "neutral" as const,
          priority: 5,
        }]
      : [];

  const priorityQueue = [
    ...manualFollowUpItems,
    ...opportunityFollowUpItems,
    ...paymentAttentionItems,
    ...cleanupItems,
  ].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return getSortDate(a.due_date, "") - getSortDate(b.due_date, "");
  });

  const visibleQueue = priorityQueue.slice(0, 8);
  const overdueCount = priorityQueue.filter((i) => i.tone === "danger").length;
  // /follow-ups only ever shows follow-up-sourced items (manual + opportunity),
  // never the unpaid-payment or AI items also in this list — so the "See all"
  // count must reflect just that subset, or the number wouldn't match what's
  // actually there when you tap through.
  const followUpSourcedCount = manualFollowUpItems.length + opportunityFollowUpItems.length;

  // Same shape as desktop's KPI tile so the "Follow-ups Due" number means the
  // same thing on both platforms — follow-up-specific, not the mixed queue.
  const followUpSchedule = [...manualFollowUpItems, ...opportunityFollowUpItems]
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return getSortDate(a.due_date, "") - getSortDate(b.due_date, "");
    })
    .slice(0, 5);
  const followUpOverdueCount = followUpSchedule.filter((i) => i.priority === 0).length;
  const followUpDueTodayCount = followUpSchedule.filter((i) => i.priority === 1).length;

  const jobPlural = profile.labels.jobPlural;
  const leadPlural = profile.labels.leadPlural;
  const followUpPlural = profile.labels.followUpPlural;
  const dayLabel = getDayLabel();
  const greeting = getGreeting();
  const visitsToShow = activeWork.slice(0, 5);

  const veraItems = [
    ...draftList.map((d) => ({ kind: "draft" as const, item: d })),
    ...alertList.map((a) => ({ kind: "alert" as const, item: a })),
  ];
  const veraPreview = showAllVera ? veraItems : veraItems.slice(0, 3);

  const statusLine =
    priorityQueue.length === 0
      ? "Nothing needs your attention right now."
      : overdueCount > 0
        ? `${overdueCount} ${overdueCount === 1 ? "thing needs" : "things need"} attention now.`
        : `${priorityQueue.length} ${priorityQueue.length === 1 ? "thing" : "things"} to look at today.`;

  return (
    <div className="block md:hidden pb-8">
      {/* Greeting + one-line status */}
      <div className="px-5 pt-6 pb-6">
        <p className="text-[13px] font-medium text-ud-muted mb-1.5">{dayLabel}</p>
        <p className="text-[24px] font-semibold leading-[1.2] tracking-[-0.01em] text-ud-ink mb-2">
          {greeting}, {companyName}.
        </p>
        <p className={cn("text-[15px]", overdueCount > 0 ? "text-ud-danger font-medium" : "text-ud-muted")}>
          {statusLine}
        </p>
      </div>

      {/* Business at a glance — the same KpiCard component and same numbers
          as desktop, just arranged for a narrow screen, so this reads as
          the same dashboard instead of a stripped-down mobile version. */}
      <div className="px-4 pb-6 grid grid-cols-2 gap-3">
        <Link href="/jobs" className="block">
          <KpiCard
            compact
            label={`Active ${jobPlural}`}
            value={activeWork.length}
            helper={activeWork.length > 0 ? `${activeWork.length} in progress` : "None scheduled"}
            className="cursor-pointer active:shadow-ud-raised"
          />
        </Link>
        <Link href="/crm" className="block">
          <KpiCard
            compact
            label="Open Pipeline"
            value={formatCurrency(openPipelineValue)}
            helper={`${openLeads.length} active ${leadPlural.toLowerCase()}`}
            className="cursor-pointer active:shadow-ud-raised"
          />
        </Link>
        <Link href="/sales" className="block">
          <KpiCard
            compact
            label="Unpaid Revenue"
            value={formatCurrency(unpaidRevenueValue)}
            helper={unpaidRevenue.length > 0 ? `${unpaidRevenue.length} outstanding` : "All clear"}
            delta={unpaidRevenue.length > 0 ? `${unpaidRevenue.length} out` : undefined}
            deltaTone={unpaidRevenue.length > 0 ? "down" : "flat"}
            className="cursor-pointer active:shadow-ud-raised"
          />
        </Link>
        <Link href="/follow-ups" className="block">
          <KpiCard
            compact
            label={`${followUpPlural} Due`}
            value={followUpSchedule.length}
            helper={`${followUpOverdueCount} overdue · ${followUpDueTodayCount} due today`}
            delta={followUpOverdueCount > 0 ? `${followUpOverdueCount} overdue` : undefined}
            deltaTone={followUpOverdueCount > 0 ? "down" : "flat"}
            className="cursor-pointer active:shadow-ud-raised"
          />
        </Link>
        <Link href="/sales" className="col-span-2 block">
          <KpiCard
            compact
            label="Revenue This Month"
            value={formatCurrency(revenueMTD)}
            helper="Month to date"
            className="cursor-pointer active:shadow-ud-raised"
          />
        </Link>
      </div>

      {/* Vera panel — same actionable card as desktop: draft/alert cards
          with real approve/dismiss buttons, not just a link out, plus the
          live chat box. */}
      <div className="px-4 pb-6">
        <Card padding={0} radius="md" className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-ud-soft">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-ud-accent/10 flex items-center justify-center shrink-0">
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="text-ud-accent">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
                  <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z"/>
                </svg>
              </div>
              <p className="text-[13.5px] font-semibold text-ud-ink">Vera</p>
            </div>
            {veraItems.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllVera((v) => !v)}
                className="text-[13px] font-semibold text-ud-accent"
              >
                {showAllVera ? "Show less" : `See all ${veraItems.length} →`}
              </button>
            )}
          </div>

          {veraItems.length > 0 ? (
            <div className="p-3.5 space-y-3 border-b border-ud-soft">
              {veraPreview.map((entry) =>
                entry.kind === "draft" ? (
                  <VeraDraftCard
                    key={entry.item.id}
                    draft={entry.item}
                    href={getDraftHref(entry.item)}
                    onApprove={() => handleApproveDraft(entry.item.id)}
                    onDismiss={() => handleDismissDraft(entry.item.id)}
                  />
                ) : (
                  <VeraAlertCard
                    key={entry.item.id}
                    alert={entry.item}
                    href={getAlertHref(entry.item)}
                    onDismiss={() => handleDismissAlert(entry.item.id)}
                  />
                ),
              )}
            </div>
          ) : (
            <div className="px-4 py-3.5 border-b border-ud-soft">
              <p className="text-[13px] text-ud-muted">Vera reviewed your business overnight. Everything looks good.</p>
            </div>
          )}

          {chatMessages.length > 0 && (
            <div className="max-h-[240px] overflow-y-auto px-4 py-3 space-y-2.5 border-b border-ud-soft">
              {chatMessages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                  <div
                    className={
                      m.role === "user"
                        ? "inline-block max-w-[85%] rounded-[10px] px-3 py-2 text-[13px] bg-ud-accent text-white text-left"
                        : "inline-block max-w-[85%] rounded-[10px] px-3 py-2 text-[13px] bg-ud-surface-sunk text-ud-ink text-left"
                    }
                  >
                    {m.role === "model" && m.text ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="mb-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    ) : (
                      m.text || (m.streaming ? "…" : "")
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendChatMessage(chatInput);
            }}
            className="flex items-center gap-2 px-4 py-3"
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask Vera anything…"
              disabled={chatLoading}
              className="flex-1 bg-transparent text-[15px] text-ud-ink placeholder:text-ud-faint outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="rounded-[8px] bg-ud-accent text-white text-[13px] font-semibold px-3 py-[7px] hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
            >
              {chatLoading ? "…" : "Ask"}
            </button>
          </form>
        </Card>
      </div>

      {/* Priority queue — same card as desktop, same source items */}
      <div className="px-4 pb-6">
        {visibleQueue.length > 0 ? (
          <>
            <div className="flex items-center justify-between px-1 mb-2.5">
              <p className="text-[13px] font-semibold text-ud-muted uppercase tracking-[0.06em]">
                Priority queue
              </p>
              {followUpSourcedCount > 0 && (
                <Link href="/follow-ups" className="text-[13px] font-semibold text-ud-accent">
                  See all {followUpSourcedCount} follow-ups
                </Link>
              )}
            </div>
            <Card padding={0} radius="md" className="overflow-hidden">
              {visibleQueue.map((item) => {
                const pillTone: "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "ink" =
                  item.tone === "danger" ? "danger" : item.tone === "warning" ? "warning" : "neutral";
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-[16px] border-b border-ud-soft last:border-0 active:bg-ud-surface-soft"
                  >
                    <Pill tone={pillTone} className="shrink-0">{item.label}</Pill>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-ud-ink truncate">{item.title}</p>
                      <p className="text-[13px] text-ud-muted truncate mt-0.5">{item.detail}</p>
                    </div>
                    <svg className="shrink-0 text-ud-faint" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                );
              })}
            </Card>
          </>
        ) : (
          <div className="rounded-[14px] border border-ud-soft bg-ud-surface-soft px-5 py-9 text-center">
            <p className="text-[15px] font-medium text-ud-ink">You&apos;re all caught up.</p>
            <p className="text-[13px] text-ud-muted mt-1">Nothing needs attention today.</p>
          </div>
        )}
      </div>

      {/* Today's jobs — only shown when there's something to show */}
      {visitsToShow.length > 0 && (
        <div className="px-4 pb-6">
          <div className="flex items-center justify-between px-1 mb-2.5">
            <p className="text-[13px] font-semibold text-ud-muted uppercase tracking-[0.06em]">
              Today&apos;s {jobPlural.toLowerCase()}
            </p>
            <Link href="/jobs" className="text-[13px] font-semibold text-ud-accent">
              See all
            </Link>
          </div>
          <Card padding={0} radius="md" className="overflow-hidden">
            {visitsToShow.map((job) => {
              const customer =
                (job.contact_id ? customerById.get(job.contact_id) : null) ??
                (job.customer_id ? customerById.get(job.customer_id) : null);
              const tone = getWorkTone(job.status);
              const pillTone: "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "ink" =
                tone === "success" ? "success" : tone === "warning" ? "warning" : tone === "danger" ? "danger" : "neutral";
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}/edit`}
                  className="flex items-center gap-3 px-4 py-[16px] border-b border-ud-soft last:border-0 active:bg-ud-surface-soft"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-ud-ink truncate">
                      {job.service_type || `Untitled ${profile.labels.jobSingular.toLowerCase()}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Pill tone={pillTone}>{job.status || "Active"}</Pill>
                      <p className="text-[13px] text-ud-muted truncate">
                        {customer?.name || `No ${profile.labels.customerSingular.toLowerCase()} linked`}
                      </p>
                    </div>
                  </div>
                  {job.job_value != null && (
                    <span className="udv2-num text-[14px] font-semibold text-ud-ink shrink-0">
                      {formatCurrency(job.job_value)}
                    </span>
                  )}
                </Link>
              );
            })}
          </Card>
        </div>
      )}

      {/* Pipeline snapshot — same open leads desktop shows in its right column */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between px-1 mb-2.5">
          <p className="text-[13px] font-semibold text-ud-muted uppercase tracking-[0.06em]">
            Pipeline snapshot
          </p>
          <Link href="/crm" className="text-[13px] font-semibold text-ud-accent">
            See all
          </Link>
        </div>
        {openLeads.length === 0 ? (
          <div className="rounded-[14px] border border-ud-soft bg-ud-surface-soft px-5 py-7 text-center">
            <p className="text-[13px] text-ud-muted">No open {leadPlural.toLowerCase()}.</p>
          </div>
        ) : (
          <Card padding={0} radius="md" className="overflow-hidden">
            {openLeads.slice(0, 4).map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}/edit`}
                className="flex items-center gap-3 px-4 py-[16px] border-b border-ud-soft last:border-0 active:bg-ud-surface-soft"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-ud-ink truncate">
                    {lead.service_requested || `Untitled ${profile.labels.leadSingular.toLowerCase()}`}
                  </p>
                  <p className="text-[13px] text-ud-muted truncate mt-0.5">
                    {lead.status || "Lead"} · {formatCurrency(lead.estimated_value)}
                  </p>
                </div>
                <Pill tone="neutral" className="shrink-0">{lead.status || "Lead"}</Pill>
              </Link>
            ))}
          </Card>
        )}
      </div>

    </div>
  );
}
