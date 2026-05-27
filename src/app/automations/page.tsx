/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { AppShell } from "@/components/AppShell";
import { AutomationsClient } from "@/features/automations/components/AutomationsClient";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;

  const { data: automations } = await (supabase as any)
    .from("automations")
    .select("id, name, description, is_active, trigger_type, run_count, last_triggered, created_at")
    .eq("organization_id", company.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <AutomationsClient automations={automations ?? []} />
    </AppShell>
  );
}
