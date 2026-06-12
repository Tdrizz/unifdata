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

  const [{ data: automations }, { data: boards }, { data: stages }] = await Promise.all([
    (supabase as any)
      .from("automations")
      .select("id, name, description, is_active, trigger_type, run_count, last_triggered, created_at")
      .eq("organization_id", company.id)
      .order("created_at", { ascending: false }),
    (supabase as any)
      .from("process_boards")
      .select("id, name")
      .eq("organization_id", company.id)
      .order("created_at", { ascending: true }),
    (supabase as any)
      .from("board_stages")
      .select("id, name, board_id, stage_type, position")
      .eq("organization_id", company.id)
      .order("position", { ascending: true }),
  ]);

  const boardsWithStages = (boards ?? []).map((b: { id: string; name: string }) => ({
    id: b.id,
    name: b.name,
    stages: (stages ?? [])
      .filter((s: { board_id: string; stage_type: string }) => s.board_id === b.id && (s.stage_type === "active" || s.stage_type === "on_hold"))
      .map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })),
  }));

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <AutomationsClient automations={automations ?? []} boards={boardsWithStages} />
    </AppShell>
  );
}
