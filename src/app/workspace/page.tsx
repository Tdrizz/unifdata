import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getWorkspaceData } from "@/features/workspace/queries";
import { WorkspaceView } from "@/features/workspace/components/WorkspaceView";
import { MobileWorkspaceView } from "@/features/workspace/components/MobileWorkspaceView";
import { isPro } from "@/lib/feature-gates";

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
  const isProTier = isPro(company as { tier: string });

  const [data, draftsResult, alertsResult] = await Promise.all([
    getWorkspaceData(supabase, company.id),
    supabase
      .from("agent_drafts")
      .select("id, draft_type, subject, body, action_label")
      .eq("organization_id", company.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("agent_alerts")
      .select("id, alert_type, severity, title, body")
      .eq("organization_id", company.id)
      .eq("status", "unread")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const drafts = (draftsResult.data ?? []) as Array<{
    id: string;
    draft_type: string;
    subject?: string | null;
    body: string;
    action_label?: string | null;
  }>;

  const alerts = (alertsResult.data ?? []) as Array<{
    id: string;
    alert_type: string;
    severity: "info" | "warning" | "critical";
    title: string;
    body: string;
  }>;

  // ROI: sum from roi_events this month via direct query (no RPC needed)
  const { data: roiRows } = await supabase
    .from("roi_events")
    .select("amount_recovered")
    .eq("organization_id", company.id)
    .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const roiTotal = (roiRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount_recovered || 0),
    0,
  );
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
          roiTotal={roiTotal}
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
