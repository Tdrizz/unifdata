import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentCompany = await getCurrentCompany();
    if (!currentCompany) {
      return NextResponse.json({ error: "No company context" }, { status: 401 });
    }

    const { company } = currentCompany;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: proposals, error, count } = await supabase
      .from("data_reconciliation_proposals")
      .select("*", { count: "exact" })
      .eq("organization_id", company.id)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      proposals: proposals ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        hasMore: (count ?? 0) > to + 1,
      },
    });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (err instanceof Error && (err as any).digest?.startsWith("NEXT_REDIRECT")) throw err;
    console.error("[proposals]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
