/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { IntegrationsView } from "@/features/integrations/components/IntegrationsView";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
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

  const { data: integrations } = await (supabase as any)
    .from("integrations")
    .select("id, provider, provider_account_name, status, created_at")
    .eq("company_id", company.id);

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""} businessSector={company.business_sector}>
      <IntegrationsView integrations={integrations ?? []} />
    </AppShell>
  );
}
