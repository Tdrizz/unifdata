"use client";

import { useState, useEffect } from "react";
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

// Same dashboard as desktop's WorkspaceView — same KPIs, same actionable
// Vera panel, same priority queue, same jobs/pipeline sections — just
// stacked single-column instead of a side-by-side grid.
export function MobileWorkspaceView({
  customers, leads, jobs, sales, followUps, profile, companyName, drafts = [], alerts = [], lastReviewAt = null,
  initialChatSessionId = null, initialChatMessages = [],
}: Props) {
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const [draftList, setDraftList] = useState<Draft[]>(drafts);
  const [alertList, setAlertList] = useState<Alert[]>(alerts);
  // See WorkspaceView.tsx: re-syncs these from the server whenever a fresh
  // fetch hands down a new drafts/alerts array (e.g. via RealtimeRefresh),
  // since they've otherwise diverged from props for optimistic dismissal.
  useEffect(() => setDraftList(drafts), [drafts]);
  useEffect(() => setAlertList(alerts), [alerts]);
  const [showAllVera, setShowAllVera] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  // Hydrated from the persisted session server-side — see WorkspaceView.tsx
  // for why (conversation used to reset every time this panel remounted).
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  // Collapsed by default — see WorkspaceView.tsx for why. Starts open if
  // there's already an active conversation.
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

  const { openLeads, activeWork, unpaidRevenue, openPipelineValue, unpaidRevenueValue } =
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

  const jobPlural = profile.labels.jobPlural;
  const jobSingular = profile.labels.jobSingular;
  const leadPlural = profile.labels.leadPlural;
  const customerSingular = profile.labels.customerSingular;
  const dayLabel = getDayLabel();
  const greeting = getGreeting();

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

  // One unified pipeline list instead of two disconnected ones — see
  // WorkspaceView.tsx for the full reasoning (this is the same merge).
  const pipelineRows = [
    ...openLeads.map((lead) => ({
      id: `lead-${lead.id}`,
      title: lead.service_requested || `Untitled ${profile.labels.leadSingular.toLowerCase()}`,
      subtitle: formatCurrency(Number(lead.estimated_value || 0)),
      href: `/leads/${lead.id}/edit`,
      status: lead.status || "Lead",
      pillTone: "neutral" as const,
      sortDate: lead.created_at,
    })),
    ...activeWork.map((job) => {
      const customer =
        (job.contact_id ? customerById.get(job.contact_id) : null) ??
        (job.customer_id ? customerById.get(job.customer_id) : null);
      const tone = getWorkTone(job.status);
      return {
        id: `job-${job.id}`,
        title: job.service_type || `Untitled ${jobSingular.toLowerCase()}`,
        subtitle: customer?.name || `No ${customerSingular.toLowerCase()}`,
        href: `/jobs/${job.id}/edit`,
        status: job.status || "Active",
        pillTone: (tone === "success" ? "success" : tone === "warning" ? "warning" : tone === "danger" ? "danger" : "neutral") as "neutral" | "success" | "warning" | "danger",
        sortDate: job.created_at,
      };
    }),
  ]
    .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
    .slice(0, 6);

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

      {/* Business at a glance — trimmed to the 3 non-overlapping numbers,
          same as desktop (Follow-ups Due dropped as redundant with the
          Priority Queue below; Revenue This Month dropped as a lagging,
          non-actionable metric). */}
      <div className="px-4 pb-6 grid grid-cols-3 gap-2.5 items-stretch">
        <Link href="/crm" className="block h-full">
          <KpiCard
            compact
            label={`Active ${jobPlural}`}
            value={activeWork.length}
            helper={activeWork.length > 0 ? `${activeWork.length} in progress` : "None scheduled"}
            className="cursor-pointer active:shadow-ud-raised"
          />
        </Link>
        <Link href="/crm" className="block h-full">
          <KpiCard
            compact
            label="Open Pipeline"
            value={formatCurrency(openPipelineValue)}
            helper={`${openLeads.length} active ${leadPlural.toLowerCase()}`}
            className="cursor-pointer active:shadow-ud-raised"
          />
        </Link>
        <Link href="/sales" className="block h-full">
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
      </div>

      {/* Vera panel — collapsed to a one-line summary by default, same as
          desktop, so business data is what you see first. */}
      <div className="px-4 pb-6">
        <Card padding={0} radius="md" className="overflow-hidden">
          <div className={cn("flex items-center justify-between gap-3 px-4 py-3.5", veraExpanded && "border-b border-ud-soft")}>
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
                {!veraExpanded && <p className="text-[12px] text-ud-muted truncate max-w-[180px]">{veraSummaryLine}</p>}
              </div>
            </button>
            <div className="flex items-center gap-3 shrink-0">
              {veraExpanded && chatMessages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="text-[13px] font-semibold text-ud-muted"
                >
                  Clear chat
                </button>
              )}
              {veraExpanded && veraItems.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllVera((v) => !v)}
                  className="text-[13px] font-semibold text-ud-accent"
                >
                  {showAllVera ? "Show less" : `See all ${veraItems.length} →`}
                </button>
              )}
              <button
                type="button"
                onClick={() => setVeraExpanded((v) => !v)}
                className="text-[13px] font-semibold text-ud-accent"
              >
                {veraExpanded ? "Collapse" : chatMessages.length > 0 ? "Continue" : "Chat"}
              </button>
            </div>
          </div>

          {veraExpanded && (veraItems.length > 0 ? (
            <div className="p-3.5 space-y-3 border-b border-ud-soft">
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
            <div className="px-4 py-3.5 border-b border-ud-soft">
              <p className="text-[13px] text-ud-muted">
                {lastReviewAt
                  ? "Checked overnight — nothing needs you today."
                  : "Vera runs overnight. Your first review lands tomorrow morning."}
              </p>
              {lastReviewAt && (
                <p className="mt-1 text-[12px] text-ud-faint">
                  Looked at {activeWork.length} active {jobPlural.toLowerCase()}, {manualFollowUpItems.length + opportunityFollowUpItems.length} follow-up{manualFollowUpItems.length + opportunityFollowUpItems.length === 1 ? "" : "s"}, and {formatCurrency(unpaidRevenueValue)} outstanding.
                </p>
              )}
            </div>
          ))}

          {veraExpanded && chatMessages.length > 0 && (
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
          {veraExpanded && (
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
          )}
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
                <Link href="/crm" className="text-[13px] font-semibold text-ud-accent">
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

      {/* Your pipeline — one merged list spanning lead through active work,
          instead of two separate cards linking to two pages. See
          WorkspaceView.tsx for the full reasoning. */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between px-1 mb-2.5">
          <p className="text-[13px] font-semibold text-ud-muted uppercase tracking-[0.06em]">
            Your pipeline
          </p>
          <Link href="/crm" className="text-[13px] font-semibold text-ud-accent">
            See all
          </Link>
        </div>
        {pipelineRows.length === 0 ? (
          <div className="rounded-[14px] border border-ud-soft bg-ud-surface-soft px-5 py-7 text-center">
            <p className="text-[13px] text-ud-muted">No {leadPlural.toLowerCase()} or active {jobPlural.toLowerCase()} right now.</p>
          </div>
        ) : (
          <Card padding={0} radius="md" className="overflow-hidden">
            {pipelineRows.map((row) => (
              <Link
                key={row.id}
                href={row.href}
                className="flex items-center gap-3 px-4 py-[16px] border-b border-ud-soft last:border-0 active:bg-ud-surface-soft"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-ud-ink truncate">{row.title}</p>
                  <p className="text-[13px] text-ud-muted truncate mt-0.5">{row.subtitle}</p>
                </div>
                <Pill tone={row.pillTone} className="shrink-0">{row.status}</Pill>
              </Link>
            ))}
          </Card>
        )}
      </div>

    </div>
  );
}
