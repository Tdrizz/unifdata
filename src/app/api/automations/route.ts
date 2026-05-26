/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "No company" }, { status: 403 });

  const { company } = currentCompany;

  let body: {
    name?: string;
    description?: string | null;
    trigger_type?: string;
    trigger_config?: Record<string, unknown>;
    conditions?: unknown[];
    actions?: unknown[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim() || !body.trigger_type) {
    return NextResponse.json({ error: "name and trigger_type are required" }, { status: 400 });
  }

  const { data: automation, error } = await (supabase as any)
    .from("automations")
    .insert({
      organization_id: company.id,
      name: body.name.trim(),
      description: body.description ?? null,
      trigger_type: body.trigger_type,
      trigger_config: body.trigger_config ?? {},
      conditions: body.conditions ?? [],
      actions: body.actions ?? [],
      is_active: true,
    })
    .select("id, name, description, is_active, trigger_type, run_count, last_triggered, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(automation);
}
