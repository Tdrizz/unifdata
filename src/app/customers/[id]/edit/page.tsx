import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { AppShell } from "@/components/AppShell";
import { ContactEditForm } from "@/features/contacts/components/ContactEditForm";

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
        />
      </div>
    </AppShell>
  );
}
