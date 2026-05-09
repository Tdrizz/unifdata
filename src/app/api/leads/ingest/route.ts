import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey || apiKey !== process.env.LEAD_INGEST_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, string | undefined>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { company_id, name, email, phone, address, service_requested, notes, source } = body;

  if (!company_id || !name || !service_requested || !source) {
    return NextResponse.json(
      { error: "Missing required fields: company_id, name, service_requested, source" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  let customerId: string | null = null;

  if (email) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", company_id)
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      customerId = existing.id as string;
    }
  } else if (phone) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", company_id)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      customerId = existing.id as string;
    }
  }

  if (!customerId) {
    const { data: newCustomer, error: customerError } = await supabase
      .from("customers")
      .insert({
        company_id,
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        customer_type: "Lead",
      })
      .select("id")
      .single();

    if (customerError || !newCustomer) {
      console.error("Failed to create customer:", customerError);
      return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
    }

    customerId = (newCustomer as { id: string }).id;
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      company_id,
      customer_id: customerId,
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
    customer_id: customerId,
  });
}
