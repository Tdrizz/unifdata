import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json([], { status: 401 });

  const { company } = currentCompany;

  const { data } = await supabase
    .from("master_customers")
    .select("id, first_name, last_name, primary_email, primary_phone")
    .eq("organization_id", company.id)
    .or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,primary_email.ilike.%${q}%,primary_phone.ilike.%${q}%`,
    )
    .order("first_name", { ascending: true })
    .limit(10);

  const results = ((data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string | null;
    primary_email: string | null;
    primary_phone: string | null;
  }>).map((r) => ({
    id: r.id,
    name: [r.first_name, r.last_name].filter(Boolean).join(" "),
    email: r.primary_email,
    phone: r.primary_phone,
  }));

  return NextResponse.json(results);
}
