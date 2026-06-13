"use client";

import { useState } from "react";
import Link from "next/link";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { EmptyState } from "@/components/ui/EmptyState";
import { CustomerCreateForm } from "@/features/customers/components/CustomerCreateForm";
import { BottomSheet } from "@/components/ui/BottomSheet";

type CustomerRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email?: string | null;
  primary_phone?: string | null;
  relationship_status?: string | null;
  source?: string | null;
  created_at?: string | null;
};

type TagInfo = { name: string; color: string };

type Props = {
  customers: CustomerRow[];
  profile?: IndustryProfile;
  activityMap?: Record<string, string>;
  tagsMap?: Record<string, TagInfo[]>;
};

const STATUS_COLORS: Record<string, string> = {
  new: "#3B82F6",
  active: "#22C55E",
  inactive: "#9CA3AF",
  on_hold: "#F59E0B",
  closed: "#EF4444",
};

function StatusDot({ status }: { status: string | null | undefined }) {
  const color = STATUS_COLORS[status ?? "active"] ?? "#9CA3AF";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
      title={status ?? "active"}
    />
  );
}

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getDisplayName(c: CustomerRow): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "#f1f5f9", color: "#334155" },
  { bg: "#dcfce7", color: "#166534" },
  { bg: "#e0e7ff", color: "#3730a3" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#ffe4e6", color: "#9f1239" },
  { bg: "#e0f2fe", color: "#0369a1" },
];

function avatarColor(name: string) {
  const idx = (name || "").charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export function ContactsTableClient({
  customers,
  profile,
  activityMap = {},
  tagsMap = {},
}: Props) {
  const custPlural = profile?.labels.customerPlural ?? "Contacts";
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const q = search.toLowerCase().trim();
  const filtered = q
    ? customers.filter(
        (c) =>
          getDisplayName(c).toLowerCase().includes(q) ||
          (c.primary_email ?? "").toLowerCase().includes(q) ||
          (c.primary_phone ?? "").toLowerCase().includes(q)
      )
    : customers;

  return (
    <>
    {/* Mobile contacts list */}
    <div className="md:hidden px-4 pt-5 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[18px] font-bold text-ud-ink">Contacts</h1>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="px-3 py-1.5 text-[12px] font-semibold bg-ud-accent text-white rounded-[8px] hover:opacity-90"
        >
          + Add
        </button>
      </div>
      <div className="bg-ud-surface border border-ud rounded-[12px] overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-[13px] text-ud-muted text-center py-8">No contacts yet.</p>
        ) : (
          filtered.map((c) => {
            const displayName = getDisplayName(c);
            const phone = c.primary_phone ?? null;
            const status = c.relationship_status;
            return (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,0,0,0.04)] last:border-b-0 hover:bg-[rgba(0,0,0,0.015)]"
              >
                <div className="w-8 h-8 rounded-full bg-ud-accent/10 flex items-center justify-center text-[13px] font-bold text-ud-accent shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ud-ink truncate">{displayName}</p>
                  <p className="text-[11px] text-ud-muted truncate">{c.primary_email ?? phone ?? "No contact info"}</p>
                </div>
                {status && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] bg-ud-surface-sunk text-ud-muted shrink-0 capitalize">
                    {status}
                  </span>
                )}
              </Link>
            );
          })
        )}
      </div>
      {profile && (
        <>
          <button
            onClick={() => setSheetOpen(true)}
            className="fixed bottom-[calc(72px+env(safe-area-inset-bottom)+12px)] right-4 z-30 w-12 h-12 rounded-full bg-ud-accent text-white shadow-ud-pop flex items-center justify-center active:scale-95 transition-transform md:hidden"
            aria-label={"Add " + profile.labels.customerSingular}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={"Add " + profile.labels.customerSingular}>
            <CustomerCreateForm profile={profile} />
          </BottomSheet>
        </>
      )}
    </div>
    <div className="hidden md:block px-8 pt-7 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-0.5">
            {custPlural}
          </div>
          <h1 className="text-[22px] font-bold text-ud-ink">All contacts</h1>
          <div className="text-[13px] text-ud-muted mt-0.5">{customers.length} contacts</div>
        </div>
        <a
          href="#add-contact"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-ud-accent text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
        >
          + Add {profile?.labels.customerSingular.toLowerCase() ?? "contact"}
        </a>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2.5 px-[14px] py-[9px] bg-ud-surface border border-ud rounded-[10px] shadow-ud mb-4">
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" className="text-ud-faint shrink-0">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border-0 outline-none bg-transparent text-[13.5px] text-ud-ink placeholder:text-ud-faint"
          style={{ fontFamily: "var(--font)" }}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          body="Add your first contact or import a list to get started."
          action={
            <Link
              href="/imports"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-ud-surface border border-ud text-[13px] font-semibold text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-colors"
            >
              Import contacts
            </Link>
          }
        />
      ) : (
      <div className="overflow-hidden rounded-[var(--radius-ud-lg,10px)] border border-[rgba(0,0,0,0.06)] shadow-ud">
        <table className="w-full border-collapse bg-ud-surface">
          <thead>
            <tr>
              {["Name", "Contact", "Status", "Tags", "Last activity", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-[10px] text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint bg-[rgba(0,0,0,0.015)] border-b border-ud whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child_td]:border-b-0 [&_tr:hover_td]:bg-[rgba(0,0,0,0.012)]">
            {(
              filtered.map((contact) => {
                const name = getDisplayName(contact);
                const initials = getInitials(name);
                const col = avatarColor(name);
                const contactTags = tagsMap[contact.id] ?? [];
                const lastActivity = activityMap[contact.id];
                const phone = contact.primary_phone ?? null;

                return (
                  <tr key={contact.id}>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ background: col.bg, color: col.color }}
                        >
                          {initials}
                        </div>
                        <Link
                          href={`/customers/${contact.id}`}
                          className="font-semibold text-ud-ink hover:text-ud-accent transition-colors"
                        >
                          {name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">
                      {contact.primary_email || phone || "—"}
                    </td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]">
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={contact.relationship_status} />
                        <span className="text-ud-muted capitalize">
                          {(contact.relationship_status ?? "active").replace("_", " ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]">
                      <div className="flex items-center gap-1 flex-wrap">
                        {contactTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.name}
                            className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {contactTags.length > 3 && (
                          <span className="text-[10px] text-ud-faint">
                            +{contactTags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">
                      {formatRelativeTime(lastActivity)}
                    </td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]">
                      <Link
                        href={`/customers/${contact.id}`}
                        className="text-ud-accent no-underline font-medium text-[12px] hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      {profile && (
        <div id="add-contact" className="mt-6 scroll-mt-20">
          <CustomerCreateForm profile={profile} />
        </div>
      )}
    </div>
    </>
  );
}
