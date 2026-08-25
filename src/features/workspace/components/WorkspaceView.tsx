"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { VeraDraftCard, VeraAlertCard } from "@/components/vera/VeraCards";
import { getAlertHref, getDraftHref } from "@/lib/agents/alert-routing";
import { isOverdue, isDueToday } from "@/lib/date-format";
import { formatCurrency } from "@/lib/utils";
import { isOpenFollowUp, getWorkTone } from "@/lib/status";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { WorkspaceData } from "../queries";
import { getDayLabel, getGreeting, getSortDate, getFollowUpLabel, getFollowUpTone, computeWorkspaceStats } from "../compute";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Pill } from "@/components/ui/Pill";
import { PageHeader } from "@/components/ui/PageHeader";

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
type ChatMessage = { role: "user" | "model"; text: string; streaming?: boolean };
type Props = WorkspaceData & {
  profile: IndustryProfile;
  companyName: string;
  drafts?: Draft[];
  alerts?: Alert[];
  initialChatSessionId?: string | null;
  initialChatMessages?: ChatMessage[];
};

export function WorkspaceView({
  customers, leads, jobs, sales, followUps, profile, companyName, drafts = [], alerts = [],
  initialChatSessionId = null, initialChatMessages = [],
}: Props) {
  const [draftList, setDraftList] = useState<Draft[]>(drafts);
  const [alertList, setAlertList] = useState<Alert[]>(alerts);
  const [showAllVera, setShowAllVera] = useState(false);
  const [chatInput, setChatInput] = useState("");
  // Hydrated from the persisted session server-side so the conversation
  // survives navigating away and back — this panel used to start empty on
  // every mount even though the backend already kept the full history.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(initialChatSessionId);

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

  const customerById = new Map(customers.map((c) => [c.id, c]));

  const { openLeads, activeWork, unpaidRevenue, openPipelineValue, unpaidRevenueValue, revenueMTD } =
    computeWorkspaceStats({ leads, jobs, sales });

  const manualFollowUpItems: QueueItem[] = followUps
    .filter((action) => isOpenFollowUp(action.status))
    .map((action) => ({
      id: `manual-follow-up-${action.id}`,
      label: getFollowUpLabel(action.due_date),
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
      label: getFollowUpLabel(lead.next_follow_up_date),
      title: lead.service_requested || `Follow up on ${profile.labels.leadSingular.toLowerCase()}`,
      detail: getFollowUpLabel(lead.next_follow_up_date),
      href: `/leads/${lead.id}/edit`,
      tone: getFollowUpTone(lead.next_follow_up_date),
      due_date: lead.next_follow_up_date,
      priority: isOverdue(lead.next_follow_up_date) ? 0 : isDueToday(lead.next_follow_up_date) ? 1 : lead.next_follow_up_date ? 2 : 4,
    }));

  const paymentAttentionItems: QueueItem[] = unpaidRevenue.map((record) => ({
    id: `payment-${record.id}`,
    label: "Payment needed",
    title: record.service_type || formatCurrency(record.amount),
    detail: `${formatCurrency(record.amount)} unpaid`,
    href: `/sales/${record.id}/edit`,
    tone: "danger" as const,
    priority: 1,
  }));

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
  ]
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return getSortDate(a.due_date, "") - getSortDate(b.due_date, "");
    })
    .slice(0, 8);

  const followUpSchedule = [...manualFollowUpItems, ...opportunityFollowUpItems]
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return getSortDate(a.due_date, "") - getSortDate(b.due_date, "");
    })
    .slice(0, 5);

  const dayLabel = getDayLabel();
  const jobPlural = profile.labels.jobPlural;
  const jobSingular = profile.labels.jobSingular;
  const leadPlural = profile.labels.leadPlural;
  const customerSingular = profile.labels.customerSingular;
  const followUpPlural = profile.labels.followUpPlural;

  const overdueCount = followUpSchedule.filter((i) => i.priority === 0).length;
  const dueTodayCount = followUpSchedule.filter((i) => i.priority === 1).length;

  const veraItems = [
    ...draftList.map((d) => ({ kind: "draft" as const, item: d })),
    ...alertList.map((a) => ({ kind: "alert" as const, item: a })),
  ];
  const veraPreview = showAllVera ? veraItems : veraItems.slice(0, 3);

  const statusLine = (() => {
    const parts: string[] = [];
    if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
    if (dueTodayCount > 0) parts.push(`${dueTodayCount} due today`);
    if (activeWork.length > 0) parts.push(`${activeWork.length} ${jobPlural.toLowerCase()} active`);
    if (unpaidRevenueValue > 0) parts.push(`${formatCurrency(unpaidRevenueValue)} outstanding`);
    if (parts.length === 0 && revenueMTD > 0) parts.push(`${formatCurrency(revenueMTD)} this month`);
    return parts.length > 0 ? parts.join(" · ") : "Nothing urgent today";
  })();

  return (
    <div className="hidden md:block px-8 pt-7 pb-12">
      {/* Page header */}
      <PageHeader
        eyebrow={dayLabel}
        title={`${getGreeting()}, ${companyName}.`}
        description={statusLine}
        className="mb-6"
        actions={
          <>
            <Link href="/jobs" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-transparent text-ud-text border border-transparent hover:bg-ud-surface-sunk px-2.5 py-1.5 text-xs rounded-[8px]">View calendar</Link>
            <Link href="/customers" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-ud-surface text-ud-ink border border-ud shadow-ud hover:border-ud-hard px-3 py-2 text-[13px] rounded-[9px]">
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Quick add
            </Link>
          </>
        }
      />

      {/* Vera panel — always has a live chat box, not just a link out */}
      <Card padding={0} radius="md" className="overflow-hidden mb-6">
        <div className="flex items-center justify-between gap-3 px-[22px] py-4 border-b border-ud-soft">
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
              className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-transparent text-ud-text border border-transparent hover:bg-ud-surface-sunk px-2.5 py-1.5 text-xs rounded-[8px]"
            >
              {showAllVera ? "Show less" : `See all ${veraItems.length} →`}
            </button>
          )}
        </div>

        {veraItems.length > 0 ? (
          <div className="p-4 space-y-3 border-b border-ud-soft">
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
          <div className="px-[22px] py-4 border-b border-ud-soft">
            <p className="text-[13px] text-ud-muted">Vera reviewed your business overnight. Everything looks good.</p>
          </div>
        )}

        {chatMessages.length > 0 && (
          <div className="max-h-[280px] overflow-y-auto px-[22px] py-4 space-y-2.5 border-b border-ud-soft">
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
          className="flex items-center gap-2 px-[18px] py-3"
        >
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask Vera anything about your business…"
            disabled={chatLoading}
            className="flex-1 bg-transparent text-[13.5px] text-ud-ink placeholder:text-ud-faint outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            className="rounded-[8px] bg-ud-accent text-white text-[12.5px] font-semibold px-3 py-[7px] hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
          >
            {chatLoading ? "…" : "Ask"}
          </button>
        </form>
      </Card>

      {/* KPI row — every tile routes to the page that actually has the data */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <Link href="/jobs" className="block">
          <KpiCard
            label={`Active ${jobPlural}`}
            value={activeWork.length}
            helper={activeWork.length > 0 ? `${activeWork.length} in progress` : "None scheduled"}
            className="cursor-pointer transition-shadow duration-[120ms] hover:shadow-ud-raised"
          />
        </Link>
        <Link href="/crm" className="block">
          <KpiCard
            label="Open Pipeline"
            value={formatCurrency(openPipelineValue)}
            helper={`${openLeads.length} active ${leadPlural.toLowerCase()}`}
            className="cursor-pointer transition-shadow duration-[120ms] hover:shadow-ud-raised"
          />
        </Link>
        <Link href="/sales" className="block">
          <KpiCard
            label="Unpaid Revenue"
            value={formatCurrency(unpaidRevenueValue)}
            helper={unpaidRevenue.length > 0 ? `${unpaidRevenue.length} outstanding` : "All clear"}
            delta={unpaidRevenue.length > 0 ? `${unpaidRevenue.length} out` : undefined}
            deltaTone={unpaidRevenue.length > 0 ? "down" : "flat"}
            className="cursor-pointer transition-shadow duration-[120ms] hover:shadow-ud-raised"
          />
        </Link>
        <Link href="/follow-ups" className="block">
          <KpiCard
            label={`${followUpPlural} Due`}
            value={followUpSchedule.length}
            helper={`${overdueCount} overdue · ${dueTodayCount} due today`}
            delta={overdueCount > 0 ? `${overdueCount} overdue` : undefined}
            deltaTone={overdueCount > 0 ? "down" : "flat"}
            className="cursor-pointer transition-shadow duration-[120ms] hover:shadow-ud-raised"
          />
        </Link>
        <Link href="/sales" className="block">
          <KpiCard
            label="Revenue This Month"
            value={formatCurrency(revenueMTD)}
            helper="Month to date"
            className="cursor-pointer transition-shadow duration-[120ms] hover:shadow-ud-raised"
          />
        </Link>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-[1.2fr_0.8fr] gap-5 items-start">
        {/* Priority queue */}
        <Card padding={0} radius="md" className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-[22px] py-4 border-b border-ud-soft">
            <p className="text-[13.5px] font-semibold text-ud-ink">Priority queue</p>
            <Link href="/follow-ups" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-transparent text-ud-text border border-transparent hover:bg-ud-surface-sunk px-2.5 py-1.5 text-xs rounded-[8px]">View all</Link>
          </div>
          {priorityQueue.length === 0 ? (
            <p className="px-5 py-5 text-sm text-ud-muted text-center">Nothing needs attention right now.</p>
          ) : (
            priorityQueue.map((item, idx) => (
              <Link key={item.id} href={item.href}>
                <ListRow
                  leading={<Pill tone={item.tone}>{item.label}</Pill>}
                  title={item.title}
                  subtitle={item.detail}
                  isLast={idx === priorityQueue.length - 1}
                  onClick={() => {}}
                />
              </Link>
            ))
          )}
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Jobs today */}
          <Card padding={0} radius="md" className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-[22px] py-4 border-b border-ud-soft">
              <p className="text-[13.5px] font-semibold text-ud-ink">{jobPlural} today</p>
              <Link href="/jobs" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-transparent text-ud-text border border-transparent hover:bg-ud-surface-sunk px-2.5 py-1.5 text-xs rounded-[8px]">Calendar</Link>
            </div>
            {activeWork.length === 0 ? (
              <p className="px-5 py-5 text-sm text-ud-muted">No active {jobPlural.toLowerCase()} right now.</p>
            ) : (
              activeWork.slice(0, 5).map((job, idx) => {
                const customer =
                  (job.contact_id ? customerById.get(job.contact_id) : null) ??
                  (job.customer_id ? customerById.get(job.customer_id) : null);
                const tone = getWorkTone(job.status);
                return (
                  <Link key={job.id} href={`/jobs/${job.id}/edit`}>
                    <ListRow
                      leading={<Pill tone={tone}>{job.status || "Active"}</Pill>}
                      title={job.service_type || `Untitled ${jobSingular.toLowerCase()}`}
                      subtitle={customer?.name || `No ${customerSingular.toLowerCase()}`}
                      isLast={idx === Math.min(activeWork.length, 5) - 1}
                      onClick={() => {}}
                    />
                  </Link>
                );
              })
            )}
          </Card>

          {/* Pipeline snapshot */}
          <Card padding={0} radius="md" className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-[22px] py-4 border-b border-ud-soft">
              <p className="text-[13.5px] font-semibold text-ud-ink">Pipeline snapshot</p>
              <Link href="/crm" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-transparent text-ud-text border border-transparent hover:bg-ud-surface-sunk px-2.5 py-1.5 text-xs rounded-[8px]">View all</Link>
            </div>
            {openLeads.length === 0 ? (
              <p className="px-5 py-5 text-sm text-ud-muted">No open {leadPlural.toLowerCase()}.</p>
            ) : (
              openLeads.slice(0, 4).map((lead, idx) => (
                <Link key={lead.id} href={`/leads/${lead.id}/edit`}>
                  <ListRow
                    trailing={<Pill tone="neutral">{lead.status || "Lead"}</Pill>}
                    title={lead.service_requested || `Untitled ${profile.labels.leadSingular.toLowerCase()}`}
                    subtitle={`${lead.status || "Lead"} · ${formatCurrency(lead.estimated_value)}`}
                    isLast={idx === Math.min(openLeads.length, 4) - 1}
                    onClick={() => {}}
                  />
                </Link>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
