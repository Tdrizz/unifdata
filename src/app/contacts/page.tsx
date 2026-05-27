/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { AppShell } from "@/components/AppShell";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { ContactsTableClient } from "@/features/contacts/components/ContactsTableClient";
import ContactsSidebar from "@/features/contacts/components/ContactsSidebar";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string; tag?: string; source?: string; group?: string }>;
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

  // Sidebar data — fetch in parallel with contacts
  const [
    allContactsResult,
    tagsWithCountsResult,
    smartGroupsResult,
  ] = await Promise.all([
    (supabase as any)
      .from("master_customers")
      .select("id, relationship_status, source")
      .eq("organization_id", company.id),
    (supabase as any)
      .from("tags")
      .select("id, name, color, contact_tags(count)")
      .eq("organization_id", company.id),
    (supabase as any)
      .from("smart_groups")
      .select("id, name, contact_count")
      .eq("organization_id", company.id),
  ]);

  const allContacts: Array<{ id: string; relationship_status?: string | null; source?: string | null }> =
    allContactsResult.data ?? [];

  // Status counts
  const statusCounts: Record<string, number> = {};
  for (const c of allContacts) {
    const s = c.relationship_status ?? "active";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  // Source counts
  const sourceCounts: Record<string, number> = {};
  for (const c of allContacts) {
    if (c.source) {
      sourceCounts[c.source] = (sourceCounts[c.source] ?? 0) + 1;
    }
  }

  const tags: Array<{ id: string; name: string; color: string; count: number }> =
    (tagsWithCountsResult.data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      color: t.color ?? "#6B7280",
      count: Array.isArray(t.contact_tags)
        ? t.contact_tags.reduce((s: number, r: any) => s + (r.count ?? 0), 0)
        : 0,
    }));

  const smartGroups: Array<{ id: string; name: string; contact_count: number }> =
    smartGroupsResult.data ?? [];

  // Query master_customers with active filter
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

  if (params.status) {
    query = query.eq("relationship_status", params.status);
  }

  if (params.source) {
    query = query.eq("source", params.source);
  }

  if (params.tag) {
    const { data: taggedContactIds } = await (supabase as any)
      .from("contact_tags")
      .select("contact_id")
      .eq("tag_id", params.tag);
    const ids = (taggedContactIds ?? []).map((r: { contact_id: string }) => r.contact_id);
    if (ids.length > 0) {
      query = query.in("id", ids);
    } else {
      // Tag exists but no contacts — return empty
      query = query.in("id", ["00000000-0000-0000-0000-000000000000"]);
    }
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
      <div className="flex min-h-0 flex-1">
        <ContactsSidebar
          totalCount={allContacts.length}
          statusCounts={statusCounts}
          tags={tags}
          smartGroups={smartGroups}
          sourceCounts={sourceCounts}
          activeStatus={params.status}
          activeTag={params.tag}
          activeSource={params.source}
          activeGroup={params.group}
          profileSourceOptions={profile.sourceOptions}
        />
        <div className="flex-1 min-w-0">
          <ContactsTableClient
            customers={contactList}
            profile={profile}
            activityMap={activityMap}
            tagsMap={tagsMap}
          />
        </div>
      </div>
    </AppShell>
  );
}
