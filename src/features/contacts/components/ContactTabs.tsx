"use client";

import { useState } from "react";
import { ContactActivityTab } from "./ContactActivityTab";
import { ContactNotesTab } from "./ContactNotesTab";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

function statusTone(status: string | null | undefined): Tone {
  const s = (status ?? "").toLowerCase();
  if (s.includes("complet") || s.includes("paid") || s.includes("done")) return "success";
  if (s.includes("cancel") || s.includes("overdue") || s.includes("failed")) return "danger";
  if (s.includes("pending") || s.includes("open") || s.includes("new")) return "warning";
  return "neutral";
}

type ActivityRow = {
  id: string;
  event_type: string;
  event_label: string;
  event_detail: string | null;
  source: string;
  created_at: string;
};

type NoteRow = {
  id: string;
  content: string;
  pinned: boolean;
  author_name: string | null;
  created_at: string;
};

type JobRow = {
  id: string;
  service_type: string | null;
  status: string | null;
  job_value: number | null;
  start_date: string | null;
  completed_date: string | null;
  created_at: string;
};

type SaleRow = {
  id: string;
  service_type: string | null;
  amount: number | null;
  payment_status: string | null;
  sale_date: string | null;
  created_at: string;
};

type FollowUpRow = {
  id: string;
  message: string | null;
  due_date: string | null;
  status: string | null;
  created_at: string;
};

type Tab = "activity" | "notes" | "records" | "communications";

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint">{title}</span>
      {count > 0 && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-ud-surface-sunk text-ud-muted border border-ud">
          {count}
        </span>
      )}
    </div>
  );
}

function RecordsTab({ jobs, sales, followUps }: { jobs: JobRow[]; sales: SaleRow[]; followUps: FollowUpRow[] }) {
  if (jobs.length === 0 && sales.length === 0 && followUps.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-[13px] font-semibold text-ud-ink mb-1">No records yet</p>
        <p className="text-[12.5px] text-ud-muted">Jobs, sales, and follow-ups linked to this contact will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {jobs.length > 0 && (
        <div>
          <SectionHeader title="Jobs" count={jobs.length} />
          <div className="space-y-2">
            {jobs.map((job) => (
              <a key={job.id} href={`/jobs/${job.id}/edit`} className="block p-3 rounded-[9px] border border-ud hover:bg-ud-surface-sunk transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ud-ink truncate">{job.service_type || "Untitled job"}</p>
                    <p className="text-[11px] text-ud-muted mt-0.5">{formatDate(job.start_date || job.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.job_value != null && (
                      <span className="text-[12px] font-semibold text-ud-ink">{formatCurrency(job.job_value)}</span>
                    )}
                    <StatusBadge tone={statusTone(job.status)}>{job.status ?? "active"}</StatusBadge>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {sales.length > 0 && (
        <div>
          <SectionHeader title="Sales" count={sales.length} />
          <div className="space-y-2">
            {sales.map((sale) => (
              <a key={sale.id} href={`/sales/${sale.id}/edit`} className="block p-3 rounded-[9px] border border-ud hover:bg-ud-surface-sunk transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ud-ink truncate">{sale.service_type || "Sale"}</p>
                    <p className="text-[11px] text-ud-muted mt-0.5">{formatDate(sale.sale_date || sale.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[12px] font-semibold text-ud-ink">{formatCurrency(sale.amount)}</span>
                    <StatusBadge tone={statusTone(sale.payment_status)}>{sale.payment_status ?? "unpaid"}</StatusBadge>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {followUps.length > 0 && (
        <div>
          <SectionHeader title="Follow-ups" count={followUps.length} />
          <div className="space-y-2">
            {followUps.map((fu) => (
              <a key={fu.id} href={`/follow-ups/${fu.id}/edit`} className="block p-3 rounded-[9px] border border-ud hover:bg-ud-surface-sunk transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ud-ink truncate">{fu.message || "Follow-up"}</p>
                    <p className="text-[11px] text-ud-muted mt-0.5">Due {formatDate(fu.due_date)}</p>
                  </div>
                  <StatusBadge tone={statusTone(fu.status)}>{fu.status ?? "open"}</StatusBadge>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ContactTabs({
  activities,
  notes,
  jobs,
  sales,
  followUps,
  contactId,
  orgId,
}: {
  activities: ActivityRow[];
  notes: NoteRow[];
  jobs: JobRow[];
  sales: SaleRow[];
  followUps: FollowUpRow[];
  contactId: string;
  orgId: string;
}) {
  const [tab, setTab] = useState<Tab>("activity");

  const tabs: { id: Tab; label: string }[] = [
    { id: "activity", label: "Activity" },
    { id: "notes", label: "Notes" },
    { id: "records", label: `Records (${jobs.length + sales.length + followUps.length})` },
    { id: "communications", label: "Communications" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-ud mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.id
                ? "border-ud-accent text-ud-accent"
                : "border-transparent text-ud-muted hover:text-ud-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "activity" && <ContactActivityTab activities={activities} />}
        {tab === "notes" && (
          <ContactNotesTab notes={notes} contactId={contactId} orgId={orgId} />
        )}
        {tab === "records" && (
          <RecordsTab jobs={jobs} sales={sales} followUps={followUps} />
        )}
        {tab === "communications" && (
          <div className="py-10 text-center">
            <p className="text-[13px] font-semibold text-ud-ink mb-1">No messages yet</p>
            <p className="text-[12.5px] text-ud-muted mb-4">SMS conversations with this contact will appear here.</p>
            <a href="/communications" className="text-[12.5px] text-ud-accent hover:underline">
              View all communications →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
