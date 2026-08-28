"use client";

import { useState, useEffect } from "react";
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
  lastReviewAt?: string | null;
  initialChatSessionId?: string | null;
  initialChatMessages?: ChatMessage[];
};

export function WorkspaceView({
  customers, leads, jobs, sales, followUps, profile, companyName, drafts = [], alerts = [], lastReviewAt = null,
  initialChatSessionId = null, initialChatMessages = [],
}: Props) {
  const [draftList, setDraftList] = useState<Draft[]>(drafts);
  const [alertList, setAlertList] = useState<Alert[]>(alerts);
  // draftList/alertList start from props but then diverge for optimistic
  // dismiss actions, so a fresh server fetch (e.g. from RealtimeRefresh
  // picking up a background agent run) wouldn't otherwise reach them —
  // this re-syncs whenever the server actually hands down a new drafts/
  // alerts array, which is exactly when there's something new to show.
  useEffect(() => setDraftList(drafts), [drafts]);
  useEffect(() => setAlertList(alerts), [alerts]);
  const [showAllVera, setShowAllVera] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  // Hydrated from the persisted session server-side so the conversation
  // survives navigating away and back — this panel used to start empty on
  // every mount even though the backend already kept the full history.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  // Collapsed by default so business data is what you see first, not a big
  // chat panel — but starts open if there's already an active conversation,
  // rather than hiding it behind a click right after you were just using it.
  const [veraExpanded, setVeraExpanded] = useState(initialChatMessages.length > 0);
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

  async function handleClearChat() {
    setChatMessages([]);
    if (chatSessionId) {
      try {
        await fetch("/api/ai/session/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: chatSessionId }),
        });
      } catch {
        // Best-effort — the local conversation is already cleared either way.
      }
    }
  }

  async function handleApproveDraft(id: string) {
    setDraftError(null);
    // The approve route returns a real reason when a send can't go through
    // (no email on file, delivery rejected, sending not configured). Without
    // an else branch here the button simply reset and the card stayed put,
    // so the owner clicked Send over and over with no idea why nothing
    // happened -- worse than showing them the problem.
    try {
      const res = await fetch(`/api/v1/agent-drafts/${id}/approve`, { method: "POST" });
      if (res.ok) {
        setDraftList((prev) => prev.filter((d) => d.id !== id));
        return;
      }
      const data = await res.json().catch(() => ({}));
      setDraftError(data.error || "That didn't send. Try again in a moment.");
    } catch {
      setDraftError("Couldn't reach the server. Check your connection and try again.");
    }
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

  const overdueCount = followUpSchedule.filter((i) => i.priority === 0).length;
  const dueTodayCount = followUpSchedule.filter((i) => i.priority === 1).length;

  const veraItems = [
    ...draftList.map((d) => ({ kind: "draft" as const, item: d })),
    ...alertList.map((a) => ({ kind: "alert" as const, item: a })),
  ];
  const veraPreview = showAllVera ? veraItems : veraItems.slice(0, 3);
  const veraSummaryLine =
    veraItems.length > 0
      ? `${veraItems.length} thing${veraItems.length === 1 ? "" : "s"} to look at`
      : lastReviewAt
        ? "Checked overnight — nothing needs you today."
        : "Vera runs overnight. Your first review lands tomorrow morning.";

  const statusLine = (() => {
    const parts: string[] = [];
    if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
    if (dueTodayCount > 0) parts.push(`${dueTodayCount} due today`);
    if (activeWork.length > 0) parts.push(`${activeWork.length} ${jobPlural.toLowerCase()} active`);
    if (unpaidRevenueValue > 0) parts.push(`${formatCurrency(unpaidRevenueValue)} outstanding`);
    if (parts.length === 0 && revenueMTD > 0) parts.push(`${formatCurrency(revenueMTD)} this month`);
    return parts.length > 0 ? parts.join(" · ") : "Nothing urgent today";
  })();

  // One unified pipeline list instead of two disconnected ones (leads-only,
  // jobs-only) that used to link out to two different pages — an
  // opportunity used to visually vanish from one list and reappear in the
  // other as it moved forward, which read as two separate systems instead
  // of one flow. openLeads/activeWork are already mutually exclusive (a
  // lead is excluded the moment it's Won, which is also the moment it gets
  // a job), so merging them can't double-count. Sold work is deliberately
  // left off — the "Unpaid Revenue" KPI and Priority Queue already cover
  // that side; this list is about what's still moving forward.
  const pipelineRows = [
    ...openLeads.map((lead) => ({
      id: `lead-${lead.id}`,
      title: lead.service_requested || `Untitled ${profile.labels.leadSingular.toLowerCase()}`,
      subtitle: formatCurrency(Number(lead.estimated_value || 0)),
      href: `/leads/${lead.id}/edit`,
      status: lead.status || "Lead",
      tone: "neutral" as const,
      sortDate: lead.created_at,
    })),
    ...activeWork.map((job) => {
      const customer =
        (job.contact_id ? customerById.get(job.contact_id) : null) ??
        (job.customer_id ? customerById.get(job.customer_id) : null);
      return {
        id: `job-${job.id}`,
        title: job.service_type || `Untitled ${jobSingular.toLowerCase()}`,
        subtitle: customer?.name || `No ${customerSingular.toLowerCase()}`,
        href: `/jobs/${job.id}/edit`,
        status: job.status || "Active",
        tone: getWorkTone(job.status),
        sortDate: job.created_at,
      };
    }),
  ]
    .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
    .slice(0, 6);

  return (
    <div className="hidden md:block px-8 pt-7 pb-12">
      {/* Page header */}
      <PageHeader
        eyebrow={dayLabel}
        title={`${getGreeting()}, ${companyName}.`}
        description={statusLine}
        className="mb-6"
      />

      {/* Vera panel — collapsed to a one-line summary by default so business
          data is what you see first; expands to the full cards + live chat. */}
      <Card padding={0} radius="md" className="overflow-hidden mb-6">
        <div className={`flex items-center justify-between gap-3 px-[22px] py-4 ${veraExpanded ? "border-b border-ud-soft" : ""}`}>
          <button
            type="button"
            onClick={() => setVeraExpanded((v) => !v)}
            className="flex items-center gap-2.5 min-w-0 text-left"
          >
            <div className="w-6 h-6 rounded-full bg-ud-accent/10 flex items-center justify-center shrink-0">
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="text-ud-accent">
                <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
                <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-ud-ink">Vera</p>
              {!veraExpanded && <p className="text-[12px] text-ud-muted truncate max-w-[320px]">{veraSummaryLine}</p>}
            </div>
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            {veraExpanded && chatMessages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear conversation"
                className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-transparent text-ud-muted border border-transparent hover:bg-ud-surface-sunk hover:text-ud-danger px-2.5 py-1.5 text-xs rounded-[8px]"
              >
                Clear chat
              </button>
            )}
            {veraExpanded && veraItems.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllVera((v) => !v)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-transparent text-ud-text border border-transparent hover:bg-ud-surface-sunk px-2.5 py-1.5 text-xs rounded-[8px]"
              >
                {showAllVera ? "Show less" : `See all ${veraItems.length} →`}
              </button>
            )}
            <button
              type="button"
              onClick={() => setVeraExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-ud-surface-sunk text-ud-ink border border-ud px-2.5 py-1.5 text-xs rounded-[8px]"
            >
              {veraExpanded ? "Collapse" : chatMessages.length > 0 ? "Continue chat" : "Chat"}
            </button>
          </div>
        </div>

        {veraExpanded && (veraItems.length > 0 ? (
          <div className="p-4 space-y-3 border-b border-ud-soft">
            {draftError && (
              <div className="mb-3 rounded-[9px] border border-ud bg-ud-warning-bg px-3 py-2 text-[12.5px] text-ud-warning">
                {draftError}
              </div>
            )}
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
            <p className="text-[13px] text-ud-muted">
                {lastReviewAt
                  ? "Checked overnight — nothing needs you today."
                  : "Vera runs overnight. Your first review lands tomorrow morning."}
              </p>
              {lastReviewAt && (
                <p className="mt-1 text-[12px] text-ud-faint">
                  Looked at {activeWork.length} active {jobPlural.toLowerCase()}, {followUpSchedule.length} follow-up{followUpSchedule.length === 1 ? "" : "s"}, and {formatCurrency(unpaidRevenueValue)} outstanding.
                </p>
              )}
          </div>
        ))}

        {veraExpanded && chatMessages.length > 0 && (
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

        {veraExpanded && (
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
        )}
      </Card>

      {/* KPI row — trimmed to the 3 non-overlapping numbers. Follow-ups Due
          dropped (the Priority Queue below already covers this, in more
          useful detail); Revenue This Month dropped (a lagging metric, not
          actionable day-to-day, and duplicated the Sales page anyway). */}
      <div className="grid grid-cols-3 gap-3 mb-6 items-stretch">
        <Link href="/crm" className="block h-full">
          <KpiCard
            label={`Active ${jobPlural}`}
            value={activeWork.length}
            helper={activeWork.length > 0 ? `${activeWork.length} in progress` : "None scheduled"}
            className="cursor-pointer transition-shadow duration-[120ms] hover:shadow-ud-raised"
          />
        </Link>
        <Link href="/crm" className="block h-full">
          <KpiCard
            label="Open Pipeline"
            value={formatCurrency(openPipelineValue)}
            helper={`${openLeads.length} active ${leadPlural.toLowerCase()}`}
            className="cursor-pointer transition-shadow duration-[120ms] hover:shadow-ud-raised"
          />
        </Link>
        <Link href="/sales" className="block h-full">
          <KpiCard
            label="Unpaid Revenue"
            value={formatCurrency(unpaidRevenueValue)}
            helper={unpaidRevenue.length > 0 ? `${unpaidRevenue.length} outstanding` : "All clear"}
            delta={unpaidRevenue.length > 0 ? `${unpaidRevenue.length} out` : undefined}
            deltaTone={unpaidRevenue.length > 0 ? "down" : "flat"}
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
            <Link href="/crm" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-transparent text-ud-text border border-transparent hover:bg-ud-surface-sunk px-2.5 py-1.5 text-xs rounded-[8px]">View all</Link>
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
          {/* Your pipeline — one merged list spanning lead through active
              work, instead of two separate cards linking to two pages. */}
          <Card padding={0} radius="md" className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-[22px] py-4 border-b border-ud-soft">
              <p className="text-[13.5px] font-semibold text-ud-ink">Your pipeline</p>
              <Link href="/crm" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[120ms] ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-accent/40 disabled:opacity-50 bg-transparent text-ud-text border border-transparent hover:bg-ud-surface-sunk px-2.5 py-1.5 text-xs rounded-[8px]">View all</Link>
            </div>
            {pipelineRows.length === 0 ? (
              <p className="px-5 py-5 text-sm text-ud-muted">No {leadPlural.toLowerCase()} or active {jobPlural.toLowerCase()} right now.</p>
            ) : (
              pipelineRows.map((row, idx) => (
                <Link key={row.id} href={row.href}>
                  <ListRow
                    leading={<Pill tone={row.tone}>{row.status}</Pill>}
                    title={row.title}
                    subtitle={row.subtitle}
                    isLast={idx === pipelineRows.length - 1}
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
