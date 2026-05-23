import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { clearSession } from "@/features/ai-assistant/queries";

export async function POST(request: Request) {
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const supabase = await createClient();
  await clearSession(supabase, body.sessionId);

  return NextResponse.json({ ok: true });
}
