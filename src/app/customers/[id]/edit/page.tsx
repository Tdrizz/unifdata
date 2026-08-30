import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { AppShell } from "@/components/AppShell";
import { ContactEditForm } from "@/features/contacts/components/ContactEditForm";
import { getContactRelatedCounts, describeContactRelatedCounts } from "@/lib/crm/related-counts";

export const dynamic = "force-dynamic";

export default async function CustomerEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { data: contact } = await supabase
    .from("master_customers")
    .select("id, first_name, last_name, primary_email, primary_phone, billing_address, relationship_status, metadata")
    .eq("id", id)
    .eq("organization_id", company.id)
    .maybeSingle();

  if (!contact) {
    // Resolve legacy customers-table ids carried by old bookmarks/links.
    const { data: byLegacy } = await supabase
      .from("master_customers")
      .select("id")
      .eq("legacy_customer_id", id)
      .eq("organization_id", company.id)
      .maybeSingle();

    if (byLegacy) redirect(`/customers/${byLegacy.id}/edit`);
    notFound();
  }

  const profile = getIndustryProfile(company.business_sector);

  // Custom fields: definitions the org has set up in Settings, plus any
  // values already saved on this contact (see ContactCustomFields.tsx).
  const [fieldDefsResult, fieldValuesResult] = await Promise.all([
    supabase
      .from("custom_field_definitions")
      .select("id, label, field_key, field_type, options, required, position")
      .eq("organization_id", company.id)
      .eq("entity_type", "contact")
      .order("position", { ascending: true }),
    supabase
      .from("custom_field_values")
      .select("field_id, value")
      .eq("organization_id", company.id)
      .eq("entity_type", "contact")
      .eq("entity_id", id),
  ]);

  const customFields = (fieldDefsResult.data ?? []).map((f) => ({
    ...f,
    options: f.options as string[] | null,
  }));
  const customFieldValues: Record<string, string | null> = {};
  for (const v of fieldValuesResult.data ?? []) {
    customFieldValues[v.field_id] = v.value;
  }

  const relatedCounts = await getContactRelatedCounts(supabase, company.id, contact.id);
  const deleteWarning = describeContactRelatedCounts(relatedCounts);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-7 md:px-7">
        <ContactEditForm
          contact={{
            ...contact,
            billing_address: contact.billing_address as { line1?: string } | null,
            metadata: contact.metadata as { customer_type?: string; notes?: string } | null,
          }}
          profile={profile}
          errorParam={errorParam}
          customFields={customFields}
          customFieldValues={customFieldValues}
          deleteWarning={deleteWarning}
        />
      </div>
    </AppShell>
  );
}
