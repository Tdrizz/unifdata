"use client";

import { useState } from "react";
import Link from "next/link";
import { MobileShell } from "@/components/MobileShell";
import { SendMessageModal } from "./components/SendMessageModal";
import { Avatar } from "@/components/ui/Avatar";
import { Display } from "@/components/ui/Display";
import { StatStrip } from "@/components/ui/StatStrip";
import { Pill } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { Database } from "@/types/db";
import type { IndustryProfile } from "@/lib/industry-profiles";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];

type Props = {
  customer: CustomerRow;
  leads: LeadRow[];
  jobs: JobRow[];
  sales: SaleRow[];
  profile?: IndustryProfile;
};

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function QuickActionButton({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-1 rounded-[10px] border border-ud bg-ud-surface p-[10px_4px] text-center transition-colors hover:bg-ud-surface-soft"
    >
      <span className="text-ud-accent">{icon}</span>
      <span className="text-[10.5px] font-semibold text-ud-muted">{label}</span>
    </a>
  );
}

export function MobileCustomerDetail({ customer, leads, jobs, sales, profile }: Props) {
  const leadLabel = profile?.labels.leadPlural ?? "Quotes";
  const jobLabel = profile?.labels.jobPlural ?? "Visits";
  const saleLabel = profile?.labels.salePlural ?? "Payments";
  const saleSingular = profile?.labels.saleSingular ?? "Payment";
  const custLabel = profile?.labels.customerPlural ?? "Clients";
  const custSingular = profile?.labels.customerSingular ?? "Client";
  const TABS = ["Overview", leadLabel, jobLabel, saleLabel, "Activity"] as const;
  const [activeTab, setActiveTab] = useState<string>("Overview");

  const lifetimeRevenue = sales.reduce((sum, s) => sum + Number(s.amount ?? 0), 0);
  const openLeads = leads.filter((l) => !["lost", "closed", "won", "declined"].includes((l.status ?? "").toLowerCase()));
  const openCount = openLeads.length + jobs.filter((j) => !["completed", "done", "cancelled"].includes((j.status ?? "").toLowerCase())).length;

  const phone = customer.phone;
  const email = customer.email;
  const clientSince = formatDateShort(customer.created_at);

  const trailing = (
    <div className="flex items-center gap-1">
      {phone && (
        <a
          href={`tel:${phone}`}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-ud bg-ud-accent text-white"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91A16 16 0 0 0 15.09 15.91l.8-.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-ud bg-ud-surface text-ud-faint hover:text-ud-text transition-colors"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 7 10-7" />
          </svg>
        </a>
      )}
    </div>
  );

  return (
    <MobileShell back={{ href: "/customers", label: custLabel }} trailing={trailing} companyName="">
      {/* Identity block */}
      <div className="flex flex-col items-center px-[18px] pb-[16px] pt-[8px] text-center">
        <Avatar name={customer.name} size={56} />
        <Display size={22} className="mt-3">
          {customer.name}
        </Display>
        {(email || phone) && (
          <p className="mt-1 text-[13px] text-ud-muted">
            {email || phone}
          </p>
        )}
        <p className="mt-0.5 text-[12px] text-ud-faint">
          {custSingular} since {clientSince}
        </p>
        {customer.customer_type && (
          <div className="mt-2">
            <Pill tone="neutral">{customer.customer_type}</Pill>
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-[18px] grid w-full grid-cols-4 gap-[7px]">
          <QuickActionButton
            href={phone ? `tel:${phone}` : "#"}
            label="Call"
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91A16 16 0 0 0 15.09 15.91l.8-.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            }
          />
          <div className="flex flex-col items-center gap-1 rounded-[10px] border border-ud bg-ud-surface p-[10px_4px] text-center transition-colors hover:bg-ud-surface-soft">
            <SendMessageModal
              customerId={customer.id}
              customerName={customer.name || "Customer"}
              phone={phone ?? null}
              email={email ?? null}
              compact
            />
          </div>
          <QuickActionButton
            href={customer.address ? `https://maps.google.com/?q=${encodeURIComponent(customer.address)}` : "#"}
            label="Route"
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            }
          />
          <QuickActionButton
            href="/leads#leads-quick-add"
            label="New"
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Stat strip */}
      <div className="px-[14px] pb-[14px]">
        <StatStrip
          items={[
            { label: "Lifetime", value: lifetimeRevenue > 0 ? formatCurrency(lifetimeRevenue) : "—" },
            { label: "Open", value: openCount },
            { label: jobLabel, value: jobs.filter((j) => j.status?.toLowerCase().includes("complet")).length },
          ]}
        />
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-ud-soft no-scrollbar">
        {TABS.map((tab) => {
          const count = tab === leadLabel ? leads.length : tab === jobLabel ? jobs.length : tab === saleLabel ? sales.length : 0;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "shrink-0 px-4 py-3 text-[13px] font-medium transition-colors",
                activeTab === tab
                  ? "border-b-2 border-ud-ink text-ud-ink font-semibold -mb-px"
                  : "text-ud-muted hover:text-ud-text",
              )}
            >
              {tab}
              {count > 0 && <span className="ml-1 text-ud-faint">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="px-[14px] py-[14px]">
        {activeTab === "Overview" && (
          <div className="space-y-[14px]">
            <Card padding={0}>
              <p className="px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ud-muted border-b border-ud-soft">
                Contact
              </p>
              {[
                { label: "Email", value: email || "—" },
                { label: "Phone", value: phone || "—" },
                { label: "Address", value: customer.address || "—" },
                { label: "Type", value: customer.customer_type || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between px-4 py-3 border-b border-ud-soft last:border-0 gap-3">
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ud-faint w-[80px] shrink-0">{label}</p>
                  <p className="text-[13px] text-ud-text text-right flex-1 break-all">{value}</p>
                </div>
              ))}
            </Card>
            {customer.notes && (
              <Card padding={14}>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ud-muted mb-2">Notes</p>
                <p className="text-[13px] text-ud-text leading-[1.6]">{customer.notes}</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === leadLabel && (
          <div className="space-y-2">
            {leads.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-ud-faint">No {leadLabel.toLowerCase()} yet.</p>
            ) : leads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}/edit`}>
                <div className="flex items-center gap-3 rounded-[10px] border border-ud bg-ud-surface px-4 py-3 shadow-ud hover:bg-ud-surface-soft transition-colors">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", lead.status === "won" || lead.status === "accepted" ? "bg-ud-success" : lead.status === "lost" ? "bg-ud-faint" : "bg-ud-accent")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ud-ink truncate">{lead.service_requested || `Untitled ${(profile?.labels.leadSingular ?? "lead").toLowerCase()}`}</p>
                    <p className="text-[11.5px] text-ud-muted">{lead.status || "Open"}</p>
                  </div>
                  {lead.estimated_value && (
                    <p className="udv2-num text-[13px] font-semibold text-ud-ink shrink-0">{formatCurrency(lead.estimated_value)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === jobLabel && (
          <div className="space-y-2">
            {jobs.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-ud-faint">No {jobLabel.toLowerCase()} yet.</p>
            ) : jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}/edit`}>
                <div className="flex items-center gap-3 rounded-[10px] border border-ud bg-ud-surface px-4 py-3 shadow-ud hover:bg-ud-surface-soft transition-colors">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", job.status === "completed" ? "bg-ud-success" : "bg-ud-accent")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ud-ink truncate">{job.service_type || (profile?.labels.jobSingular ?? "Visit")}</p>
                    <p className="text-[11.5px] text-ud-muted">{job.status || "Scheduled"} · {formatRelativeDate(job.start_date)}</p>
                  </div>
                  {job.job_value && (
                    <p className="udv2-num text-[13px] font-semibold text-ud-ink shrink-0">{formatCurrency(job.job_value)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === saleLabel && (
          <div className="space-y-2">
            {sales.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-ud-faint">No {saleLabel.toLowerCase()} yet.</p>
            ) : sales.map((sale) => (
              <Link key={sale.id} href={`/sales/${sale.id}/edit`}>
                <div className="flex items-center gap-3 rounded-[10px] border border-ud bg-ud-surface px-4 py-3 shadow-ud hover:bg-ud-surface-soft transition-colors">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", sale.payment_status === "paid" ? "bg-ud-success" : "bg-ud-warning")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ud-ink truncate">{sale.service_type || saleSingular}</p>
                    <p className={cn("text-[11.5px]", sale.payment_status === "paid" ? "text-ud-success" : "text-ud-warning")}>
                      {sale.payment_status || "Pending"}
                    </p>
                  </div>
                  <p className="udv2-num text-[13px] font-semibold text-ud-ink shrink-0">{formatCurrency(sale.amount)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === "Activity" && (
          <div className="space-y-3">
            {[...leads, ...jobs, ...sales].length === 0 ? (
              <p className="py-8 text-center text-[13px] text-ud-faint">No activity yet.</p>
            ) : (
              [...leads.map((l) => ({ date: l.created_at, type: profile?.labels.leadSingular ?? "Quote", note: l.service_requested || "Untitled" })),
               ...jobs.map((j) => ({ date: j.created_at, type: profile?.labels.jobSingular ?? "Visit", note: j.service_type || (profile?.labels.jobSingular ?? "Visit") })),
               ...sales.map((s) => ({ date: s.created_at, type: "Payment", note: formatCurrency(s.amount) })),
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center pt-1">
                      <span className="w-2 h-2 rounded-full bg-ud-surface-sunk border border-ud shrink-0" />
                      {i < 10 && <span className="w-px flex-1 bg-ud-border mt-1" />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ud-faint">{formatRelativeDate(item.date)} · {item.type}</p>
                      <p className="text-[13px] text-ud-ink font-medium mt-0.5">{item.note}</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
