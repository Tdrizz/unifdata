import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { AppShell } from "@/components/AppShell";
import { ProcessBoardClient } from "@/features/process/components/ProcessBoardClient";

export const dynamic = "force-dynamic";

export default async function ProcessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;

  // Fetch default board
  const { data: board } = await (supabase as any)
    .from("process_boards")
    .select("id, name, description")
    .eq("organization_id", company.id)
    .eq("is_default", true)
    .maybeSingle();

  let stages: unknown[] = [];
  let records: unknown[] = [];

  if (board) {
    // Fetch stages + records in parallel
    const [stagesResult, recordsResult] = await Promise.all([
      (supabase as any)
        .from("board_stages")
        .select("id, name, position, color, stage_type")
        .eq("board_id", board.id)
        .order("position", { ascending: true }),
      (supabase as any)
        .from("process_records")
        .select(`
          id, name, value, target_date, status, stage_id, contact_id, created_at,
          contact:master_customers(id, name, first_name, last_name)
        `)
        .eq("board_id", board.id)
        .eq("organization_id", company.id)
        .in("status", ["active", "on_hold"])
        .order("created_at", { ascending: false }),
    ]);

    stages = stagesResult.data ?? [];
    records = recordsResult.data ?? [];
  }

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <ProcessBoardClient
        board={board ?? null}
        stages={stages as Parameters<typeof ProcessBoardClient>[0]["stages"]}
        records={records as Parameters<typeof ProcessBoardClient>[0]["records"]}
        orgId={company.id}
      />
    </AppShell>
  );
}
