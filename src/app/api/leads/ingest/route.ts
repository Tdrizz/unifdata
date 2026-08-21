import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { splitName } from "@/lib/crm/legacy-shape";

export async function POST(req: NextRequest) {
  const rawKey = req.headers.get("x-api-key");

  if (!rawKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const supabase = createServiceClient();

  const { data: apiKey } = await supabase
    .from("api_keys")
    .select("id, company_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { company_id, id: keyId } = apiKey;

  let body: Record<string, string | undefined>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email, phone, address, service_requested, notes, source } = body;

  if (!name || !service_requested || !source) {
    return NextResponse.json(
      { error: "Missing required fields: name, service_requested, source" },
      { status: 400 },
    );
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyId)
    .then(() => {});

  let contactId: string | null = null;

  if (email) {
    const { data: existing } = await supabase
      .from("master_customers")
      .select("id")
      .eq("organization_id", company_id)
      .eq("primary_email", email)
      .maybeSingle();

    if (existing) contactId = existing.id as string;
  } else if (phone) {
    const { data: existing } = await supabase
      .from("master_customers")
      .select("id")
      .eq("organization_id", company_id)
      .eq("primary_phone", phone)
      .maybeSingle();

    if (existing) contactId = existing.id as string;
  }

  if (!contactId) {
    const { first_name, last_name } = splitName(name);
    const { data: newCustomer, error: customerError } = await supabase
      .from("master_customers")
      .insert({
        organization_id: company_id,
        first_name,
        last_name,
        primary_email: email || null,
        primary_phone: phone || null,
        billing_address: address ? { line1: address } : null,
        relationship_status: "new",
        source: "api",
      })
      .select("id")
      .single();

    if (customerError || !newCustomer) {
      console.error("Failed to create contact:", customerError);
      return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
    }

    contactId = (newCustomer as { id: string }).id;
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      company_id,
      contact_id: contactId,
      service_requested,
      source,
      status: "New",
      notes: notes || null,
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    console.error("Failed to create lead:", leadError);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    lead_id: (lead as { id: string }).id,
    contact_id: contactId,
  });
}
