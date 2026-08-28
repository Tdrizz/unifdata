import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { findDuplicateContact } from "@/lib/crm/contacts";

// Phase 03 — create-time duplicate warning. Called on a debounce while
// someone types a phone/email into the "add contact" form or the
// ContactCombobox's inline "+ Add new contact" panel, so those UIs can show
// a "this looks like an existing contact — merge or create anyway?" banner
// *before* a second record gets created for the same person. Non-blocking:
// this only ever informs, it never prevents the actual create request.
//
// See findDuplicateContact for why the match is intentionally exact
// (phone/email only) rather than fuzzy.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const phone = searchParams.get("phone");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json(null, { status: 401 });

  const match = await findDuplicateContact(supabase, currentCompany.company.id, email, phone);
  return NextResponse.json(match);
}
