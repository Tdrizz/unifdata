import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getSettingsIntegrations } from "@/features/settings/queries";
import { SettingsView } from "@/features/settings/components/SettingsView";

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
  const integrations = await getSettingsIntegrations(supabase, company.id);
  const geminiEnabled = Boolean(process.env.GEMINI_API_KEY);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
      businessSector={company.business_sector}
    >
      <SettingsView
        company={{
          id: company.id,
          name: company.name,
          business_sector: company.business_sector,
          brand_color: company.brand_color || "#0f172a",
          accent_color: company.accent_color || "#2563eb",
        }}
        user={{ email: user.email || "" }}
        integrations={integrations}
        geminiEnabled={geminiEnabled}
      />
    </AppShell>
  );
}
