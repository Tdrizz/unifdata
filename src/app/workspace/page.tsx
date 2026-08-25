import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RealtimeRefreshServer } from "@/components/RealtimeRefreshServer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getWorkspaceData } from "@/features/workspace/queries";
import { getOrCreateSession } from "@/features/ai-assistant/queries";
import { WorkspaceView } from "@/features/workspace/components/WorkspaceView";
import { MobileWorkspaceView } from "@/features/workspace/components/MobileWorkspaceView";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;

  const profile = getIndustryProfile(company.business_sector);

  const [data, draftsResult, alertsResult, chatSession] = await Promise.all([
    getWorkspaceData(supabase, company.id),
    supabase
      .from("agent_drafts")
      .select("id, draft_type, subject, body, action_label, reasoning, record_id")
      .eq("organization_id", company.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("agent_alerts")
      .select("id, alert_type, severity, title, body, reasoning, record_id")
      .eq("organization_id", company.id)
      .eq("status", "unread")
      .order("created_at", { ascending: false })
      .limit(10),
    // Best-effort: the Vera panel just starts with an empty conversation if
    // this fails, rather than the whole dashboard failing to load over a
    // chat-history nicety.
    getOrCreateSession(supabase, company.id).catch(() => ({ id: null, messages: [] })),
  ]);

  const drafts = (draftsResult.data ?? []) as unknown as Array<{
    id: string;
    draft_type: string;
    subject?: string | null;
    body: string;
    action_label?: string | null;
    reasoning?: string | null;
    record_id?: string | null;
  }>;

  const alerts = (alertsResult.data ?? []) as unknown as Array<{
    id: string;
    alert_type: string;
    severity: "info" | "warning" | "critical";
    title: string;
    body: string;
    reasoning?: string | null;
    record_id?: string | null;
  }>;

  const agentInboxCount = drafts.length + alerts.length;

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
      agentInboxCount={agentInboxCount}
    >
      <>
        <RealtimeRefreshServer
          orgId={company.id}
          tables={[
            { table: "leads" },
            { table: "jobs" },
            { table: "sales" },
            { table: "follow_ups" },
            { table: "master_customers", column: "organization_id" },
            { table: "agent_drafts", column: "organization_id" },
            { table: "agent_alerts", column: "organization_id" },
          ]}
        />
        <WorkspaceView
          {...data}
          profile={profile}
          companyName={company.name}
          drafts={drafts}
          alerts={alerts}
          initialChatSessionId={chatSession.id}
          initialChatMessages={chatSession.messages}
        />
        <MobileWorkspaceView
          {...data}
          profile={profile}
          companyName={company.name}
          drafts={drafts}
          alerts={alerts}
          initialChatSessionId={chatSession.id}
          initialChatMessages={chatSession.messages}
        />
      </>
    </AppShell>
  );
}
