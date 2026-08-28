/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { AppShell } from "@/components/AppShell";
import { CommunicationsClient } from "@/features/communications/components/CommunicationsClient";

export const dynamic = "force-dynamic";

export default async function CommunicationsPage({
  searchParams,
}: {
  // Customer detail pages link here as /communications?contact=<id> to start
  // or resume a conversation with a specific contact — see below.
  searchParams: Promise<{ contact?: string }>;
}) {
  const { contact: contactParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;

  // Fetch threads sorted by last_message_at
  const { data: threads } = await (supabase as any)
    .from("communications")
    .select(`
      id, contact_id, contact_phone, channel, unread_count,
      last_message_at, last_message_preview, status,
      contact:master_customers(id, first_name, last_name)
    `)
    .eq("organization_id", company.id)
    .order("last_message_at", { ascending: false })
    .limit(50);

  // Total unread for the shell
  const totalUnread = (threads ?? []).reduce(
    (sum: number, t: { unread_count: number }) => sum + (t.unread_count ?? 0),
    0
  );

  // If ?contact=<id> matched an existing thread on their preferred channel
  // (SMS if they have a phone on file, email otherwise), open straight into
  // it. Otherwise, resolve just enough to let the client show a "start the
  // conversation" composer -- no thread exists yet, so nothing is created
  // until the first message actually sends.
  let initialSelectedThreadId: string | null = null;
  let initialPendingContact: { id: string; name: string; phone: string | null; email: string | null } | null = null;
  if (contactParam) {
    const { data: contact } = await (supabase as any)
      .from("master_customers")
      .select("id, first_name, last_name, primary_phone, primary_email")
      .eq("id", contactParam)
      .eq("organization_id", company.id)
      .maybeSingle();

    if (contact) {
      const preferredChannel = contact.primary_phone ? "sms" : "email";
      const existingThread = (threads ?? []).find(
        (t: { contact_id: string | null; channel: string }) =>
          t.contact_id === contactParam && t.channel === preferredChannel,
      );
      if (existingThread) {
        initialSelectedThreadId = existingThread.id;
      } else {
        initialPendingContact = {
          id: contact.id,
          name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unnamed",
          phone: contact.primary_phone ?? null,
          email: contact.primary_email ?? null,
        };
      }
    }
  }

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
      agentInboxCount={totalUnread}
    >
      {/* h-full, not a hardcoded viewport calc -- the shell's own scroll
          container (.content on desktop, <main> on mobile) is already a
          flex-1 child with a real computed height, and mobile's header/tab
          bar heights differ from desktop's, so a fixed 100vh-60px overflowed
          or left a gap depending on platform. */}
      <div className="h-full">
        <CommunicationsClient
          threads={threads ?? []}
          orgId={company.id}
          initialSelectedThreadId={initialSelectedThreadId}
          initialPendingContact={initialPendingContact}
        />
      </div>
    </AppShell>
  );
}
