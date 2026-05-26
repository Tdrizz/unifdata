/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { AppShell } from "@/components/AppShell";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { ContactsTableClient } from "@/features/contacts/components/ContactsTableClient";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const page = Number(params.page ?? 1);
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Query master_customers for this org
  let query = (supabase as any)
    .from("master_customers")
    .select("id, name, first_name, last_name, email, phone, primary_phone, relationship_status, source, created_at")
    .eq("organization_id", company.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.q) {
    query = query.or(
      `name.ilike.%${params.q}%,email.ilike.%${params.q}%,phone.ilike.%${params.q}%,primary_phone.ilike.%${params.q}%`
    );
  }

  const { data: customers } = await query;
  const contactList = customers ?? [];
  const contactIds = contactList.map((c: { id: string }) => c.id);

  // Fetch last activity per contact
  const activityMap: Record<string, string> = {};
  if (contactIds.length > 0) {
    const { data: activities } = await (supabase as any)
      .from("contact_activity")
      .select("contact_id, created_at")
      .in("contact_id", contactIds)
      .order("created_at", { ascending: false });

    if (activities) {
      for (const a of activities) {
        if (!activityMap[a.contact_id]) {
          activityMap[a.contact_id] = a.created_at;
        }
      }
    }
  }

  // Fetch tags per contact
  const tagsMap: Record<string, { name: string; color: string }[]> = {};
  if (contactIds.length > 0) {
    const { data: tagData } = await (supabase as any)
      .from("contact_tags")
      .select("contact_id, tags(name, color)")
      .in("contact_id", contactIds);

    if (tagData) {
      for (const row of tagData) {
        if (!tagsMap[row.contact_id]) tagsMap[row.contact_id] = [];
        if (row.tags) tagsMap[row.contact_id].push(row.tags);
      }
    }
  }

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <ContactsTableClient
        customers={contactList}
        profile={profile}
        activityMap={activityMap}
        tagsMap={tagsMap}
      />
    </AppShell>
  );
}
