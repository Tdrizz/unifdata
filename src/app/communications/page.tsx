/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { AppShell } from "@/components/AppShell";
import { CommunicationsClient } from "@/features/communications/components/CommunicationsClient";

export const dynamic = "force-dynamic";

export default async function CommunicationsPage() {
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
        <CommunicationsClient threads={threads ?? []} orgId={company.id} />
      </div>
    </AppShell>
  );
}
