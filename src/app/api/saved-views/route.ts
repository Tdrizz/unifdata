import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { rateLimit } from "@/lib/rate-limit";

// Saved views: a personal list of named filter combinations per user (see
// database/044_saved_views.sql). Deliberately not shared — every query and
// insert below is scoped to both the caller's company (organization_id) AND
// the caller's own user_id, matching the app's real security boundary: the
// server client here is a service-role client (see lib/supabase/server.ts),
// so Postgres RLS never actually runs for these requests — the ".eq(...)"
// filters below are the only thing standing between one user's saved views
// and another's, exactly like every other route in this codebase scopes by
// company_id/organization_id in application code rather than relying on RLS.

const VALID_PAGES = new Set(["customers", "pipeline"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") ?? "";
  if (!VALID_PAGES.has(page)) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "No company" }, { status: 403 });

  if (!(await rateLimit(`saved-views:read:${user.id}`, 60, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Try again in a moment." }, { status: 429 });
  }

  const { data, error } = await supabase
    .from("saved_views")
    .select("id, name, filters, created_at")
    .eq("organization_id", currentCompany.company.id)
    .eq("user_id", user.id)
    .eq("page", page)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "No company" }, { status: 403 });

  if (!(await rateLimit(`saved-views:write:${user.id}`, 20, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Try again in a moment." }, { status: 429 });
  }

  let body: { page?: string; name?: string; filters?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const page = body.page ?? "";
  if (!VALID_PAGES.has(page)) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (name.length > 60) {
    return NextResponse.json({ error: "Name must be 60 characters or fewer." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("saved_views")
    .insert({
      organization_id: currentCompany.company.id,
      user_id: user.id,
      page,
      name,
      filters: body.filters ?? {},
    })
    .select("id, name, filters, created_at")
    .single();

  if (error) {
    // Unique (organization_id, user_id, page, name) violation -- a friendlier
    // message than the raw Postgres constraint error for the one mistake a
    // user is actually likely to make here (reusing a tab name).
    if (error.code === "23505") {
      return NextResponse.json({ error: "You already have a saved view with that name." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
