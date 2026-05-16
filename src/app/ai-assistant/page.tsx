import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { AiAssistantView } from "@/features/ai-assistant/AiAssistantView";
import { MobileAiView } from "@/features/ai-assistant/MobileAiView";

export const dynamic = 'force-dynamic';

export default async function AiAssistantPage() {
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

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#1D2D3E"}
      accentColor={company.accent_color || "#4A3FA8"}
      businessSector={company.business_sector}
    >
      <>
        <div className="hidden md:block">
          <AiAssistantView />
        </div>
        <div className="block md:hidden">
          <MobileAiView />
        </div>
      </>
    </AppShell>
  );
}
