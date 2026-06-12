import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { isAiAllowed, isPro } from "@/lib/feature-gates";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { AiAssistantView } from "@/features/ai-assistant/AiAssistantView";
import { MobileAiView } from "@/features/ai-assistant/MobileAiView";
import { getOrCreateSession } from "@/features/ai-assistant/queries";

export const dynamic = "force-dynamic";

type Draft = {
  id: string;
  draft_type: string;
  subject?: string | null;
  body: string;
  action_label?: string | null;
  reasoning?: string | null;
  escalation_level?: number | null;
};

type Alert = {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  reasoning?: string | null;
  escalation_level?: number | null;
};

export default async function AriaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const aiAllowed = isAiAllowed(company);
  const isProTier = isPro(company as { tier: string });
  const profile = getIndustryProfile(company.business_sector);

  let initialSessionId: string | null = null;
  let initialMessages: Array<{ role: "user" | "model"; text: string }> = [];
  if (aiAllowed) {
    try {
      const session = await getOrCreateSession(supabase, company.id);
      initialSessionId = session.id;
      initialMessages = session.messages;
    } catch {
      // non-fatal
    }
  }

  const [draftsResult, alertsResult] = await Promise.all([
    isProTier
      ? supabase
          .from("agent_drafts")
          .select("id, draft_type, subject, body, action_label, reasoning, escalation_level")
          .eq("organization_id", company.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    isProTier
      ? supabase
          .from("agent_alerts")
          .select("id, alert_type, severity, title, body, reasoning, escalation_level")
          .eq("organization_id", company.id)
          .eq("status", "unread")
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
  ]);

  const drafts = (draftsResult.data ?? []) as Draft[];
  const alerts = (alertsResult.data ?? []) as Alert[];

  const notAllowedMessage = (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center max-w-md mx-auto">
      <p className="text-[15px] font-semibold text-ud-ink mb-2">AI features unavailable</p>
      <p className="text-[13px] text-ud-muted leading-relaxed">
        AI features require a Business Associate Agreement (BAA) with each AI provider before patient data can be processed. Contact us to discuss a HIPAA-compliant plan.
      </p>
    </div>
  );

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <>
        <div className="hidden md:block">
          {aiAllowed ? (
            <AiAssistantView
              initialMessages={initialMessages}
              initialSessionId={initialSessionId}
              profile={profile}
              drafts={drafts}
              alerts={alerts}
              isPro={isProTier}
            />
          ) : notAllowedMessage}
        </div>
        <div className="block md:hidden">
          {aiAllowed ? (
            <MobileAiView
              initialMessages={initialMessages}
              initialSessionId={initialSessionId}
              drafts={drafts}
              alerts={alerts}
              isPro={isProTier}
            />
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-[14px] font-semibold text-ud-ink mb-2">AI features unavailable</p>
              <p className="text-[13px] text-ud-muted leading-relaxed">A Business Associate Agreement (BAA) is required for healthcare businesses.</p>
            </div>
          )}
        </div>
      </>
    </AppShell>
  );
}
