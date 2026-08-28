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
      .select("run_at, assessment")
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

  // Phase 04 — the post-onboarding checklist. Dismissed once and for all via
  // company.preferences (already fetched by getCurrentCompany), so it isn't
  // recomputed per item here; the three items themselves are.
  const checklistDismissed = Boolean(
    (company.preferences as Record<string, unknown> | null)?.onboarding_checklist_dismissed,
  );
  let checklist: { hasRealCustomer: boolean; hasSampleData: boolean; hasTeammate: boolean } | null = null;
  if (!checklistDismissed) {
    const [{ count: realCustomerCount }, { count: sampleCustomerCount }, { count: memberCount }] = await Promise.all([
      supabase.from("master_customers").select("id", { count: "exact", head: true }).eq("organization_id", company.id).eq("is_sample", false),
      supabase.from("master_customers").select("id", { count: "exact", head: true }).eq("organization_id", company.id).eq("is_sample", true),
      supabase.from("company_members").select("user_id", { count: "exact", head: true }).eq("company_id", company.id),
    ]);
    checklist = {
      hasRealCustomer: (realCustomerCount ?? 0) > 0,
      hasSampleData: (sampleCustomerCount ?? 0) > 0,
      hasTeammate: (memberCount ?? 0) > 1,
    };
  }

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

  const lastReview = lastReviewResult.data as { run_at: string; assessment: string | null } | null;
  const lastReviewAt = lastReview?.run_at ?? null;
  // The nightly manager already writes a specific, well-grounded 2-3 sentence
  // read of the business every night (see manager.ts) -- it was computed and
  // stored and then never actually shown to anyone; the panel only ever
  // rendered a bare item count. This is the product's headline promise
  // ("a briefing every morning") delivered from data that already exists.
  const lastAssessment = lastReview?.assessment ?? null;

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
          checklist={checklist}
          lastAssessment={lastAssessment}
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
          checklist={checklist}
          lastAssessment={lastAssessment}
          initialChatSessionId={chatSession.id}
          initialChatMessages={chatSession.messages}
        />
      </>
    </AppShell>
  );
}
