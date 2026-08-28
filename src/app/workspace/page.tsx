import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
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

  const [data, draftsResult, alertsResult, lastReviewResult, chatSession] = await Promise.all([
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
    // When Vera last actually finished a nightly review. The panel used to
    // claim "Vera reviewed your business overnight" purely because there were
    // no cards to show -- so it said that on a ten-minute-old account, and on
    // any night the queue was down and no run happened at all. Nothing is
    // claimed now unless there's a successful run to point at.
    supabase
      .from("agent_logs")
      .select("run_at")
      .eq("organization_id", company.id)
      .eq("agent_name", "nightly-coordinator")
      .is("error", null)
      .order("run_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
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

  const lastReviewAt = (lastReviewResult.data as { run_at: string } | null)?.run_at ?? null;

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
      agentInboxCount={agentInboxCount}
    >
      <>
        <RealtimeRefresh
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
          lastReviewAt={lastReviewAt}
          initialChatSessionId={chatSession.id}
          initialChatMessages={chatSession.messages}
        />
        <MobileWorkspaceView
          {...data}
          profile={profile}
          companyName={company.name}
          drafts={drafts}
          alerts={alerts}
          lastReviewAt={lastReviewAt}
          initialChatSessionId={chatSession.id}
          initialChatMessages={chatSession.messages}
        />
      </>
    </AppShell>
  );
}
