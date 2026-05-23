import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { isAiAllowed } from "@/lib/feature-gates";
import { AiAssistantView } from "@/features/ai-assistant/AiAssistantView";
import { MobileAiView } from "@/features/ai-assistant/MobileAiView";

export const dynamic = 'force-dynamic';

export default async function AiAssistantPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const currentCompany = await getCurrentCompany();

  if (!currentCompany) {
    redirect("/onboarding");
  }

  const { company } = currentCompany;
  const aiAllowed = isAiAllowed(company);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <>
        {!aiAllowed ? (
          <div className="hidden md:flex flex-col items-center justify-center py-24 px-8 text-center max-w-md mx-auto">
            <p className="text-[15px] font-semibold text-ud-ink mb-2">AI features unavailable</p>
            <p className="text-[13px] text-ud-muted leading-relaxed">
              AI features require a Business Associate Agreement (BAA) with each AI provider before patient data can be processed. Contact us to discuss a HIPAA-compliant plan.
            </p>
          </div>
        ) : (
          <div className="hidden md:block">
            <AiAssistantView />
          </div>
        )}
        {!aiAllowed ? (
          <div className="block md:hidden px-5 py-12 text-center">
            <p className="text-[14px] font-semibold text-ud-ink mb-2">AI features unavailable</p>
            <p className="text-[13px] text-ud-muted leading-relaxed">
              A Business Associate Agreement (BAA) is required for healthcare businesses. Contact us to discuss a HIPAA-compliant plan.
            </p>
          </div>
        ) : (
          <div className="block md:hidden">
            <MobileAiView />
          </div>
        )}
      </>
    </AppShell>
  );
}
