import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getSettingsIntegrations, getTeamMembers, getApiKeys } from "@/features/settings/queries";
import { getCurrentUserRole } from "@/lib/current-company";
import { SettingsView } from "@/features/settings/components/SettingsView";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentCompany = await getCurrentCompany();

  if (!currentCompany) {
    redirect("/onboarding");
  }

  const { company } = currentCompany;
  const [integrations, members, apiKeys] = await Promise.all([
    getSettingsIntegrations(supabase, company.id),
    getTeamMembers(company.id),
    getApiKeys(company.id),
  ]);
  const geminiEnabled = Boolean(process.env.GEMINI_API_KEY);
  const currentUserRole = await getCurrentUserRole();

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#1D2D3E"}
      accentColor={company.accent_color || "#4A3FA8"}
      businessSector={company.business_sector}
    >
      <SettingsView
        company={{
          id: company.id,
          name: company.name,
          business_sector: company.business_sector,
        }}
        user={{ email: user.email || "" }}
        integrations={integrations}
        geminiEnabled={geminiEnabled}
        members={members}
        currentUserRole={currentUserRole}
        apiKeys={apiKeys}
      />
    </AppShell>
  );
}
