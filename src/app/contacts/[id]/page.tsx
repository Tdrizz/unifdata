/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { AppShell } from "@/components/AppShell";
import { ContactTabs } from "@/features/contacts/components/ContactTabs";
import { StatusDot } from "@/features/contacts/components/StatusDot";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;

  // Fetch contact — must belong to this org
  const { data: contact } = await (supabase as any)
    .from("master_customers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", company.id)
    .maybeSingle();

  if (!contact) notFound();

  // Fetch recent activity + notes in parallel
  const [activityResult, notesResult] = await Promise.all([
    (supabase as any)
      .from("contact_activity")
      .select("id, event_type, event_label, event_detail, source, created_at")
      .eq("contact_id", id)
      .eq("organization_id", company.id)
      .order("created_at", { ascending: false })
      .limit(20),
    (supabase as any)
      .from("contact_notes")
      .select("id, content, pinned, author_name, created_at")
      .eq("contact_id", id)
      .eq("organization_id", company.id)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const activities = activityResult.data ?? [];
  const notes = notesResult.data ?? [];

  const displayName =
    contact.name ?? contact.first_name
      ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim()
      : "Unnamed Contact";

  const phone = contact.primary_phone ?? contact.phone ?? null;
  const email = contact.email ?? null;

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <div className="hidden md:block px-7 pb-10 pt-7 h-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-[22px] font-bold text-ud-ink">{displayName}</h1>
                <StatusDot status={contact.relationship_status} />
              </div>
              <div className="flex items-center gap-4 text-[13px] text-ud-muted">
                {phone && (
                  <a href={`tel:${phone}`} className="hover:text-ud-ink">
                    {phone}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="hover:text-ud-ink">
                    {email}
                  </a>
                )}
                {contact.company && (
                  <span className="text-ud-faint">{contact.company}</span>
                )}
                {contact.source && (
                  <span className="text-[11px] px-2 py-0.5 rounded-[5px] bg-ud-surface-sunk text-ud-muted border border-ud">
                    Source: {contact.source}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-ud-faint mt-1">
                Contact since {formatDate(contact.created_at)}
              </div>
            </div>
            <a
              href={`/customers/${id}/edit`}
              className="px-3 py-1.5 bg-ud-surface border border-ud text-[12px] font-medium text-ud-muted rounded-[8px] hover:text-ud-ink hover:border-ud-hard transition-colors"
            >
              Edit
            </a>
          </div>
        </div>

        {/* Two-panel layout */}
        <div className="flex gap-6 h-[calc(100vh-220px)]">
          {/* Left panel — details */}
          <div className="w-72 shrink-0 space-y-4">
            <div className="bg-ud-surface border border-ud rounded-[12px] p-4 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint">
                Details
              </div>

              <DetailRow label="Name" value={displayName} />
              <DetailRow label="Phone" value={phone} />
              <DetailRow label="Email" value={email} />
              {contact.company && <DetailRow label="Company" value={contact.company} />}
              {contact.address && <DetailRow label="Address" value={contact.address} />}
              {contact.city && (
                <DetailRow
                  label="Location"
                  value={[contact.city, contact.state, contact.zip].filter(Boolean).join(", ")}
                />
              )}
              <DetailRow label="Source" value={contact.source} />
              {contact.source_detail && (
                <DetailRow label="Source detail" value={contact.source_detail} />
              )}
              <DetailRow label="Status" value={contact.relationship_status ?? "active"} />
            </div>
          </div>

          {/* Right panel — tabs */}
          <div className="flex-1 bg-ud-surface border border-ud rounded-[12px] p-4 overflow-hidden flex flex-col">
            <ContactTabs
              activities={activities}
              notes={notes}
              contactId={id}
              orgId={company.id}
            />
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="block md:hidden px-4 pt-6 pb-10">
        <div className="mb-4">
          <h1 className="text-[20px] font-bold text-ud-ink">{displayName}</h1>
          <StatusDot status={contact.relationship_status} />
          {phone && (
            <a href={`tel:${phone}`} className="block text-[13px] text-ud-accent mt-1">
              {phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="block text-[13px] text-ud-muted mt-0.5">
              {email}
            </a>
          )}
        </div>
        <ContactTabs
          activities={activities}
          notes={notes}
          contactId={id}
          orgId={company.id}
        />
      </div>
    </AppShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] text-ud-faint w-[90px] shrink-0 mt-0.5">{label}</span>
      <span className="text-[13px] text-ud-ink break-words">{value}</span>
    </div>
  );
}
