import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

const ALLOWED_TABLES = ["customers", "leads", "jobs", "sales", "follow_ups"] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

function isAllowedTable(value: string): value is AllowedTable {
  return (ALLOWED_TABLES as readonly string[]).includes(value);
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (val: string) =>
    val.includes(",") || val.includes('"') || val.includes("\n")
      ? `"${val.replace(/"/g, '""')}"`
      : val;
  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => escape(String(row[h] ?? ""))).join(","),
    ),
  ].join("\n");
}

export async function GET(request: Request) {
  try {
  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const table = url.searchParams.get("table") ?? "";

  if (!isAllowedTable(table)) {
    return NextResponse.json(
      { error: "Invalid table. Allowed: customers, leads, jobs, sales, follow_ups" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table as never)
    .select("*")
    .eq("company_id", companyId)
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }

  const csv = rowsToCsv((data ?? []) as Record<string, unknown>[]);
  const date = new Date().toISOString().split("T")[0];
  const filename = `${table}-export-${date}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (err instanceof Error && (err as any).digest?.startsWith("NEXT_REDIRECT")) throw err;
    console.error("[export-csv]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
