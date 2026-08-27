import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getPendingProposalsCount } from "@/features/data-hub/queries";
import { ToolsHub } from "@/features/tools/components/ToolsHub";

export const dynamic = 'force-dynamic';

export default async function ToolsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const pendingProposals = await getPendingProposalsCount(supabase, company.id);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <ToolsHub pendingProposals={pendingProposals} />
    </AppShell>
  );
}
