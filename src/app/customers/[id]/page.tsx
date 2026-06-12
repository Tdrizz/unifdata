import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

export const dynamic = "force-dynamic";

// Legacy customer detail — resolve the master_customers record and redirect
// to /contacts. Old bookmarks and emails may still carry legacy ids.
export default async function LegacyCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const supabase = await createClient();
  const { data: byLegacy } = await supabase
    .from("master_customers")
    .select("id")
    .eq("legacy_customer_id", id)
    .eq("organization_id", currentCompany.company.id)
    .maybeSingle();

  if (byLegacy) redirect(`/contacts/${byLegacy.id}`);

  // The id may already be a master_customers id (older links from /contacts).
  const { data: byMaster } = await supabase
    .from("master_customers")
    .select("id")
    .eq("id", id)
    .eq("organization_id", currentCompany.company.id)
    .maybeSingle();

  redirect(byMaster ? `/contacts/${byMaster.id}` : "/contacts");
}
