/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIndustryProfile } from "@/lib/industry-profiles";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find companies with no default board
  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, name, business_sector");

  if (companiesError) {
    return NextResponse.json({ error: companiesError.message }, { status: 500 });
  }

  const { data: existingBoards } = await (supabase as any)
    .from("process_boards")
    .select("organization_id")
    .eq("is_default", true);

  const boardedOrgIds = new Set((existingBoards ?? []).map((b: any) => b.organization_id));
  const toSeed = (companies ?? []).filter((c) => !boardedOrgIds.has(c.id));

  let seeded = 0;
  const errors: string[] = [];

  for (const company of toSeed) {
    try {
      const profile = getIndustryProfile(company.business_sector ?? "general");

      const { data: board, error: boardError } = await (supabase as any)
        .from("process_boards")
        .insert({
          organization_id: company.id,
          name: profile.defaultBoardName ?? "Process Board",
          is_default: true,
        })
        .select("id")
        .single();

      if (boardError || !board) {
        errors.push(`${company.name}: ${boardError?.message ?? "board insert failed"}`);
        continue;
      }

      const defaultStages = profile.defaultStages ?? [
        { name: "New", stageType: "active", position: 0, color: "#6366f1" },
        { name: "In Progress", stageType: "active", position: 1, color: "#3b82f6" },
        { name: "Completed", stageType: "completed", position: 2, color: "#22c55e" },
        { name: "Cancelled", stageType: "cancelled", position: 3, color: "#ef4444" },
      ];

      await (supabase as any).from("board_stages").insert(
        defaultStages.map((s: any) => ({
          board_id: board.id,
          organization_id: company.id,
          name: s.name,
          position: s.position,
          color: s.color,
          stage_type: s.stageType,
        }))
      );

      seeded++;
    } catch (err: any) {
      errors.push(`${company.name}: ${err?.message ?? "unknown error"}`);
    }
  }

  return NextResponse.json({ ok: true, seeded, skipped: boardedOrgIds.size, errors });
}
