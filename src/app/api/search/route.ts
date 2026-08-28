import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { sanitizeSearchTerm } from "@/lib/search";

// Unified global search (Cmd+K palette) across the record types a user
// actually types names/phrases for: contacts, leads, jobs, and sales.
// /api/contacts/search predates this and stays as-is (ContactCombobox still
// uses it for a contacts-only picker) — this route is additive, not a
// replacement, and is the one the command palette now calls.
//
// Every query below is scoped to the caller's company/organization before
// anything else runs — see the auth check up front, matching the pattern in
// /api/contacts/search/route.ts.

type SearchResult = {
  type: "contact" | "lead" | "job" | "sale";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

const PER_TABLE_LIMIT = 5;

// Small helper to build a display name for the linked contact embedded on a
// lead/job/sale row, since those rows don't always have a title of their own
// (e.g. a lead with no service_requested yet still needs a display label).
function contactName(contact: { first_name: string | null; last_name: string | null } | null): string | null {
  if (!contact) return null;
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  return name || null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json([], { status: 401 });

  const { company } = currentCompany;
  const term = sanitizeSearchTerm(q);

  // Contacts are matched first, and separately from leads/jobs/sales, so
  // their ids can be reused to also catch a lead/job/sale whose own columns
  // don't mention the query but whose linked contact does (e.g. typing a
  // customer's name should surface their jobs, not just their contact card).
  const { data: contactRows } = await supabase
    .from("master_customers")
    .select("id, first_name, last_name, primary_email, primary_phone")
    .eq("organization_id", company.id)
    .or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,primary_email.ilike.%${term}%,primary_phone.ilike.%${term}%`,
    )
    .order("first_name", { ascending: true })
    .limit(PER_TABLE_LIMIT);

  const matchedContactIds = (contactRows ?? []).map((c) => c.id);
  // PostgREST's `.in.()` needs at least one value to stay valid — fall back
  // to a value that can never match a real uuid column instead of skipping
  // the clause, so the `.or()` below stays syntactically well-formed either way.
  const contactIdList = matchedContactIds.length > 0 ? matchedContactIds.join(",") : "00000000-0000-0000-0000-000000000000";

  const [leadsResult, jobsResult, salesResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id, service_requested, status, contact:master_customers(first_name, last_name)")
      .eq("company_id", company.id)
      .or(`service_requested.ilike.%${term}%,contact_id.in.(${contactIdList})`)
      .order("created_at", { ascending: false })
      .limit(PER_TABLE_LIMIT),
    supabase
      .from("jobs")
      .select("id, service_type, status, contact:master_customers(first_name, last_name)")
      .eq("company_id", company.id)
      .or(`service_type.ilike.%${term}%,contact_id.in.(${contactIdList})`)
      .order("created_at", { ascending: false })
      .limit(PER_TABLE_LIMIT),
    supabase
      .from("sales")
      .select("id, service_type, payment_status, contact:master_customers(first_name, last_name)")
      .eq("company_id", company.id)
      .or(`service_type.ilike.%${term}%,contact_id.in.(${contactIdList})`)
      .order("created_at", { ascending: false })
      .limit(PER_TABLE_LIMIT),
  ]);

  const contacts: SearchResult[] = (contactRows ?? []).map((c) => ({
    type: "contact",
    id: c.id,
    title: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed",
    subtitle: c.primary_email ?? c.primary_phone ?? null,
    href: `/customers/${c.id}`,
  }));

  type LeadRow = { id: string; service_requested: string | null; status: string; contact: { first_name: string | null; last_name: string | null } | null };
  const leads: SearchResult[] = ((leadsResult.data ?? []) as unknown as LeadRow[]).map((l) => ({
    type: "lead",
    id: l.id,
    title: l.service_requested || "Lead",
    subtitle: contactName(l.contact) ?? l.status,
    href: `/leads/${l.id}/edit`,
  }));

  type JobRow = { id: string; service_type: string | null; status: string; contact: { first_name: string | null; last_name: string | null } | null };
  const jobs: SearchResult[] = ((jobsResult.data ?? []) as unknown as JobRow[]).map((j) => ({
    type: "job",
    id: j.id,
    title: j.service_type || "Job",
    subtitle: contactName(j.contact) ?? j.status,
    href: `/jobs/${j.id}/edit`,
  }));

  type SaleRow = { id: string; service_type: string | null; payment_status: string; contact: { first_name: string | null; last_name: string | null } | null };
  const sales: SearchResult[] = ((salesResult.data ?? []) as unknown as SaleRow[]).map((s) => ({
    type: "sale",
    id: s.id,
    title: s.service_type || "Sale",
    subtitle: contactName(s.contact) ?? s.payment_status,
    href: `/sales/${s.id}/edit`,
  }));

  return NextResponse.json({ contacts, leads, jobs, sales });
}
