import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { logActivity } from "@/lib/crm/activity";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Creates a contact without navigating away — used by ContactCombobox's
// "+ Add new contact" so linking someone who doesn't exist yet doesn't mean
// abandoning whatever Lead/Job/Sale/Follow-up form is being filled out.
// Mirrors createCustomerAction's validation/side effects, minus the redirect.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "No company" }, { status: 403 });

  const { company } = currentCompany;

  let body: { name?: string; email?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const email = (body.email || "").trim();
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const phone = (body.phone || "").trim() || null;
  const nameParts = name.split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

  const { data: inserted, error } = await supabase
    .from("master_customers")
    .insert({
      organization_id: company.id,
      first_name: firstName,
      last_name: lastName,
      primary_email: email || null,
      primary_phone: phone,
      relationship_status: "new",
      source: "manual",
    })
    .select("id, first_name, last_name, primary_email, primary_phone")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await logActivity(supabase, company.id, inserted.id, {
      type: "contact_created",
      label: `${name} added`,
      source: "user",
    });
  } catch {
    // Non-fatal
  }
  return NextResponse.json({
    id: inserted.id,
    name: [inserted.first_name, inserted.last_name].filter(Boolean).join(" "),
    email: inserted.primary_email,
    phone: inserted.primary_phone,
  });
}
