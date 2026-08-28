/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { sanitizeSearchTerm } from "@/lib/search";
import { AppShell } from "@/components/AppShell";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { ContactsTableClient } from "@/features/contacts/components/ContactsTableClient";
import ContactsSidebar from "@/features/contacts/components/ContactsSidebar";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string; tag?: string; source?: string; missing?: string }>;
}) {
  const params = await searchParams;
  // Data Hub's "View →" links (missing email/phone/address) land here. It's
  // not a plain column filter -- address lives in the nested billing_address
  // JSON column -- so it's resolved the same way the `tag` filter below is:
  // pre-fetch the matching ids, then narrow the main paginated query to them.
  const missingFilter =
    params.missing === "email" || params.missing === "phone" || params.missing === "address"
      ? params.missing
      : undefined;
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
  ] = await Promise.all([
    supabase
      .from("master_customers")
      .select("id, relationship_status, source, primary_email, primary_phone, billing_address")
      .eq("organization_id", company.id),
    (supabase as any)
      .from("tags")
      .select("id, name, color, contact_tags(count)")
      .eq("organization_id", company.id),
  ]);

  const allContacts: Array<{
    id: string;
    relationship_status?: string | null;
    source?: string | null;
    primary_email?: string | null;
    primary_phone?: string | null;
    billing_address?: { line1?: string | null } | null;
    // billing_address is typed as raw Json by the generated Supabase types;
    // narrowed here the same way legacy-shape.ts's MasterCustomerRow does.
  }> = (allContactsResult.data ?? []) as any;

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

  // Query master_customers with active filter
  let query = supabase
    .from("master_customers")
    .select("id, first_name, last_name, primary_email, primary_phone, relationship_status, source, created_at")
    .eq("organization_id", company.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.q) {
    const term = sanitizeSearchTerm(params.q);
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,primary_email.ilike.%${term}%,primary_phone.ilike.%${term}%`
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

  // Same "missing" predicates Data Hub uses to count these issues
  // (src/features/data-hub/components/DataHubView.tsx) — kept in sync so a
  // "View →" link always lands on exactly the flagged records.
  const missingIds = missingFilter
    ? allContacts
        .filter((c) => {
          if (missingFilter === "email") return !c.primary_email;
          if (missingFilter === "phone") return !c.primary_phone;
          return !c.billing_address?.line1;
        })
        .map((c) => c.id)
    : undefined;
  if (missingIds) {
    query = missingIds.length > 0
      ? query.in("id", missingIds)
      : query.in("id", ["00000000-0000-0000-0000-000000000000"]);
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
      .order("created_at", { ascending: false })
      .limit(contactIds.length * 5);

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
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <RealtimeRefresh orgId={company.id} tables={[{ table: "master_customers", column: "organization_id" }]} />
        <ContactsSidebar
          totalCount={allContacts.length}
          statusCounts={statusCounts}
          tags={tags}
          sourceCounts={sourceCounts}
          activeStatus={params.status}
          activeTag={params.tag}
          activeSource={params.source}
          profileSourceOptions={profile.sourceOptions}
        />
        <div className="flex-1 min-w-0">
          <ContactsTableClient
            customers={contactList}
            profile={profile}
            missingFilter={missingFilter}
            activityMap={activityMap}
            tagsMap={tagsMap}
            statusCounts={statusCounts}
            activeStatus={params.status}
            currentFilters={{ q: params.q, status: params.status, tag: params.tag, source: params.source }}
          />
        </div>
      </div>
    </AppShell>
  );
}
