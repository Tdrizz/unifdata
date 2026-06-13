import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getWorkspaceData } from "@/features/workspace/queries";
import { WorkspaceView } from "@/features/workspace/components/WorkspaceView";
import { MobileWorkspaceView } from "@/features/workspace/components/MobileWorkspaceView";
import { isPro, isAiAllowed } from "@/lib/feature-gates";

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

  // AI-first mode: redirect to assistant on sign-in (only if AI is allowed for this sector)
  const prefs = (company.preferences ?? {}) as Record<string, unknown>;
  if (prefs.ai_first_mode === true && isAiAllowed(company)) redirect("/ai-assistant");

  const profile = getIndustryProfile(company.business_sector);
  const isProTier = isPro(company as { tier: string });

  const [data, draftsResult, alertsResult] = await Promise.all([
    getWorkspaceData(supabase, company.id),
    supabase
      .from("agent_drafts")
      .select("id, draft_type, subject, body, action_label, reasoning")
      .eq("organization_id", company.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("agent_alerts")
      .select("id, alert_type, severity, title, body, reasoning")
      .eq("organization_id", company.id)
      .eq("status", "unread")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const drafts = (draftsResult.data ?? []) as unknown as Array<{
    id: string;
    draft_type: string;
    subject?: string | null;
    body: string;
    action_label?: string | null;
    reasoning?: string | null;
  }>;

  const alerts = (alertsResult.data ?? []) as unknown as Array<{
    id: string;
    alert_type: string;
    severity: "info" | "warning" | "critical";
    title: string;
    body: string;
    reasoning?: string | null;
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
        <WorkspaceView
          {...data}
          profile={profile}
          companyName={company.name}
          drafts={drafts}
          alerts={alerts}
          isPro={isProTier}
        />
        <MobileWorkspaceView
          {...data}
          profile={profile}
          companyName={company.name}
          drafts={drafts}
          alerts={alerts}
          isPro={isProTier}
        />
      </>
    </AppShell>
  );
}
