import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

const CustomerImportSchema = z.object({
  fileName: z.string().min(1).max(255),
  customers: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        phone: z.string().max(100).optional().nullable(),
        email: z.string().max(255).optional().nullable(),
        address: z.string().max(500).optional().nullable(),
        customerType: z.string().max(255).optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
      }),
    )
    .min(1)
    .max(500),
});

export async function POST(request: Request) {
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return NextResponse.json(
      { error: "No company found for current user." },
      { status: 401 },
    );
  }

  const body = await request.json();
  const parsed = CustomerImportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid import data." },
      { status: 400 },
    );
  }

  const { fileName, customers } = parsed.data;

  const supabase = await createClient();

  const customersToInsert = customers.map((customer) => ({
    company_id: companyId,
    name: customer.name.trim(),
    phone: customer.phone?.trim() || null,
    email: customer.email?.trim() || null,
    address: customer.address?.trim() || null,
    customer_type: customer.customerType?.trim() || null,
    notes: customer.notes?.trim() || null,
  }));

  const { error: customersError } = await supabase
    .from("customers")
    .insert(customersToInsert);

  if (customersError) {
    return NextResponse.json(
      { error: customersError.message },
      { status: 500 },
    );
  }

  const { error: importError } = await supabase.from("imports").insert({
    company_id: companyId,
    file_name: fileName,
    import_type: "customers",
    status: "completed",
    records_created: customersToInsert.length,
  });

  if (importError) {
    return NextResponse.json({ error: importError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    imported: customersToInsert.length,
  });
}
